import { LinearRequest } from "./request";
import { ILinearOriginatorState } from "./originator-state";
import { waitPhase } from "../phase";
import { LinearLink, LinearRoute, LinearSegment } from "../route";

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

        if (!(await this.requestFromAllAdvancable())) {
            return false;
        }

        const phaseResponse = await waitPhase(depth, this.state.getOutstanding(), this.state.options.phaseOptions);

        await this.state.completePhase(phaseResponse);

        return true;
    }

    private async requestFromAllAdvancable() {
        var anyQueued = false;
        (await this.state.getPeerLinks()).forEach(link => {
            if (this.state.shouldAdvance(link.id)) {
                this.state.addOutstanding(link.id, this.sendRequest(link));
                anyQueued = true;
            }
        });
        return anyQueued;
    }

    private sendRequest(seg: LinearLink): LinearRequest {
        const lastResponse = this.state.getResponse(seg.id);
        const nonce = this.state.getNonce(seg.id);
        return new LinearRequest(seg.id, 
            this.state.options.network.sendLinear(seg.id, [{ terms: seg.terms, nonce: nonce }], this.state.query, lastResponse?.hiddenReentrance)
        );
    }
}