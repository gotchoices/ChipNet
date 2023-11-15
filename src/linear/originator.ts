import { LinearRequest } from "./request";
import { LinearResponse } from "./response";
import { LinearRoute } from "./route";
import { ILinearOriginatorState, LevelResponse } from "./originator-state";

export class LinearOriginator {
    constructor(
        private state: ILinearOriginatorState
    ) { }

    async discover(): Promise<LinearRoute[]> {
        for (var i = 1; i <= this.state.options.maxDepth; i++) {
            if (!await this.advance(i)) {
                break;
            }
            var routes = this.state.getRoutes();
            if (routes.length > 0) {
                return routes;
            }
        }
        return [];
    }

    private async advance(depth: number): Promise<boolean> {
        await this.state.startDepth(depth);

        if (!this.requestFromAllAdvancable()) {
            return false;
        }

        const responses = await this.waitForCriticalOrTimeout(depth);

        await this.state.completeDepth(responses);

        return true;
    }

    private requestFromAllAdvancable() {
        var anyQueued = false;
        this.state.options.peerAddresses.forEach(address => {
            if (this.state.canAdvance(address)) {
                this.state.addOutstanding(address, this.sendRequest(address));
                anyQueued = true;
            }
        });
        return anyQueued;
    }

    private async waitForCriticalOrTimeout(baseTime: number) {
        const startTime = Date.now();
        const responses: LinearResponse[] = [];
        const failures: Record<string, string> = {};

        // A promise that resolves after a minimum time
        const minTimePromise = new Promise(resolve => setTimeout(resolve, baseTime + this.state.options.minTime));

        // Map each request to a promise
        const promises = Object.entries(this.state.getOutstanding()).map(async ([address, val]) => {
            try {
                const response = await val.response;
                const linearResponse = new LinearResponse(address, val.depth, response.paths, response.hiddenData);
                responses.push(linearResponse);
                return linearResponse;
            } catch (error) {
                failures[address] = error instanceof Error ? error.message : error;
            }
        });

        // Only resolve when critical portion acheived and minimum time elapsed
        const wrappedPromise = new Promise<LinearResponse[]>(resolve => {
            promises.forEach(p => p.then(() => {
                if (this.passesThreshold(responses.length) && Date.now() - startTime >= baseTime + this.state.options.minTime) {
                    resolve(responses);
                }
            }));
        });

        const results = await Promise.race([
            wrappedPromise,
            new Promise<LinearResponse[]>(resolve => setTimeout(() => resolve(responses), baseTime + this.state.options.maxTime)),
            minTimePromise.then(() => wrappedPromise)
        ]);
        return { results, failures, actualTime: Date.now() - startTime } as LevelResponse;
    }

    private passesThreshold(count: number) {
        return count >= (this.state.options.minRatio * this.state.options.peerAddresses.length);
    }

    private sendRequest(address: string): LinearRequest {
        const lastResponse = this.state.getResponse(address);
        const nextDepth = (lastResponse?.depth ?? 0) + 1;
        const nonce = this.state.getNonce(address);
        return new LinearRequest(address, nextDepth, 
            this.state.options.network.sendLinear(address, [nonce], this.state.query, lastResponse?.hiddenData)
        );
    }
}