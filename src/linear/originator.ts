import { LinearRequest } from "./request";
import { LinearResponse } from "./response";
import { LinearRoute } from "./route";
import { ILinearOriginatorState } from "./originator-state";
import { waitPhase } from "../phase";

export class LinearOriginator {
    constructor(
        private state: ILinearOriginatorState
    ) { }

    async discover(): Promise<LinearRoute[]> {
        for (var i = await this.state.getDepth(); i <= this.state.options.maxDepth; i++) {
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
        await this.state.startPhase(depth);

        if (!this.requestFromAllAdvancable()) {
            return false;
        }

        const responses = await waitPhase(depth, this.state.getOutstanding(), this.state.options.phaseOptions);

        await this.state.completePhase(responses);

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

    private sendRequest(address: string): LinearRequest {
        const lastResponse = this.state.getResponse(address);
        const nextDepth = (lastResponse?.depth ?? 0) + 1;
        const nonce = this.state.getNonce(address);
        return new LinearRequest(address, nextDepth, 
            this.state.options.network.sendLinear(address, [nonce], this.state.query, lastResponse?.hiddenData)
        );
    }
}