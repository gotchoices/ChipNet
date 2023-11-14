import { LinearRequest } from "./linear-request";
import { LinearResponse } from "./linear-response";
import { LinearRoute } from "./linear-route";
import { ILinearState } from "./linear-state";

export class LinearOriginator {
    constructor(
        private state: ILinearState
    ) { }

    async discover(): Promise<LinearRoute[]> {
        for (var i = 0; i <= this.state.options.maxDepth; i++) {
            if (!await this.advance()) {
                break;
            }
            var routes = this.state.getRoutes();
            if (routes.length > 0) {
                return routes;
            }
        }
        return [];
    }

    private async advance(): Promise<boolean> {
        if (!this.requestFromAllAdvancable()) {
            return false;
        }

        const responses = await this.waitForCriticalOrTimeout();

        Object.entries(responses.failures).forEach(([address, error]) => 
            this.state.addFailure(address, error));

        Object.entries(responses.results).forEach(([address, response]) => 
            this.state.addResponse(address, response));

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

    private async waitForCriticalOrTimeout() {
        const startTime = Date.now();
        const results: LinearResponse[] = [];
        const failures: Record<string, string> = {};

        // A promise that resolves after a minimum time
        const minTimePromise = new Promise(resolve => setTimeout(resolve, this.state.options.minTime));

        // Map each request to a promise
        const promises = Object.entries(this.state.getOutstanding()).map(async ([address, val]) => {
            try {
                const response = await val.response;
                const linearResponse = new LinearResponse(address, val.depth, response.paths, response.hiddenData);
                results.push(linearResponse);
                return linearResponse;
            } catch (error) {
                failures[address] = error instanceof Error ? error.message : error;
            }
        });

        // Only resolve when critical portion acheived and minimum time elapsed
        const wrappedPromise = new Promise<LinearResponse[]>(resolve => {
            promises.forEach(p => p.then(() => {
                if (this.passesThreshold(results.length) && Date.now() - startTime >= this.state.options.minTime) {
                    resolve(results);
                }
            }));
        });

        return { 
            results: await Promise.race([
                wrappedPromise,
                new Promise<LinearResponse[]>(resolve => setTimeout(() => resolve(results), this.state.options.maxTime)),
                minTimePromise.then(() => wrappedPromise)
            ]),
            failures
        };
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