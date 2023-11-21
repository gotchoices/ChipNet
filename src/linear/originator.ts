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
        // TODO: look for direct matches to peers first
        
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

        const phaseResponse = await waitPhase(depth, this.state.getOutstanding(), this.state.options.phaseOptions);

        await this.state.completePhase(phaseResponse);

        return true;
    }

    private requestFromAllAdvancable() {
        var anyQueued = false;
        this.state.options.peerLinks.forEach(link => {
            if (this.state.canAdvance(link)) {
                this.state.addOutstanding(link, this.sendRequest(link));
                anyQueued = true;
            }
        });
        return anyQueued;
    }

    private sendRequest(link: string): LinearRequest {
        const lastResponse = this.state.getResponse(link);
        const nextDepth = (lastResponse?.depth ?? 0) + 1;
        const nonce = this.state.getNonce(link);
        return new LinearRequest(link, nextDepth, 
            this.state.options.network.sendLinear(link, [nonce], this.state.query, lastResponse?.hiddenReentrance)
        );
    }
}