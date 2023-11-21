import { INetwork } from "../network";
import { PhaseResponse } from "../phase";
import { LinearParticipantOptions } from "./participant-options";
import { ILinearParticipantState } from "./participant-state";
import { LinearMatch, LinearSearchResult } from "./linear-match";
import { LinearSegment } from "./linear-segment";
import { LinearQuery } from "./query";
import { LinearResponse } from "./response";

export class SimpleLinearParticipantState implements ILinearParticipantState {
    private _cycles: LinearSegment[] = [];
    private _responses: Record<string, LinearResponse> = {};
    private _failures: Record<string, string> = {};  // TODO: structured error information
    private _phaseTime: number = 0;
    
    constructor(
        public options: LinearParticipantOptions,
        public network: INetwork,
        public peerIdentities?: Record<string, LinearSegment>,  // Mapping from target identity to link
        public selfIdentity?: string,                    // Identity token for this node (should provide this or peerIdentities)
    ) { }
    
    async reportCycles(collisions: LinearSegment[]) {
        this._cycles.push(...collisions);
    }

    async search(query: LinearQuery) {
        const match = await this.getMatch(query);
        const candidates = match ? [] : await this.getCandidates(query);
        return { match, candidates } as LinearSearchResult;
    }

    private async getMatch(query: LinearQuery) {
        return this.peerIdentities[query.target] 
            ?? (this.selfIdentity === query.target 
                ? { this.selfIdentity, hiddenData: await this.getHiddenData(query) } as LinearMatch
                : undefined);
    }

    private async getHiddenData(query: LinearQuery): Promise<Uint8Array | undefined> {
        // "virtual" function, allows state to be encoded if a query is propagated to this node
        return undefined;
    }

    private async filterTerms

    private async getCandidates(query: LinearQuery): Promise<LinearSegment[]> {
        // TODO: need mechanism for matching of terms
        throw new Error("Method not implemented.");
    }

    /**
     * @returns The currently failed requests.  Do not mutate
     */
    getFailures() {
        return this._failures;
    }

    private addFailure(link: string, error: string) {
        this._failures[link] = error;
    }

    getResponse(link: string): LinearResponse | undefined {
        return this._responses[link];
    }

    private addResponse(link: string, response: LinearResponse) {
        this._responses[link] = response;
    }

    async completePhase(phaseResponse: PhaseResponse) {
        Object.entries(phaseResponse.failures).forEach(([link, error]) => 
            this.addFailure(link, error));

        Object.entries(phaseResponse.results).forEach(([link, response]) => 
            this.addResponse(link, response));

        this._phaseTime = Math.max(phaseResponse.actualTime, this._phaseTime);    // (don't allow a quickly returning depth prevent giving time for propagation)
    }
}