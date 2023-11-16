import { INetwork } from "../network";
import { PhaseResponse } from "../phase";
import { LinearParticipantOptions } from "./participant-options";
import { ILinearParticipantState, LinearMatchResult, LinearSegment } from "./participant-state";
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
        public peerIdentities?: Record<string, LinearSegment>,  // Mapping from target identity to address
        public selfIdentity?: LinearSegment,                    // Identity token for this node (should provide this or peerIdentities)
    ) { }
    
    async reportCycles(collisions: LinearSegment[]) {
        this._cycles.push(...collisions);
    }

    async getMatches(query: LinearQuery) {
        const matches = await this.getExactMatches(query);
        const candidates = matches.length ? [] : await this.getCandidates(query);
        return { matches, candidates };
    }

    private async getExactMatches(query: LinearQuery) {
        return (
            this.peerIdentities
                ? this.peerIdentities.hasOwnProperty(query.target)
                    ? [this.peerIdentities[query.target]] : []
                : []
        ).concat([this.selfIdentity]).filter(Boolean) as LinearSegment[];
    }

    private async getCandidates(query: LinearQuery): Promise<LinearSegment[]> {
        // TODO: can't implement this without inspecting metadata of query and 
        throw new Error("Method not implemented.");
    }

    /**
     * @returns The currently failed requests.  Do not mutate
     */
    getFailures() {
        return this._failures;
    }

    private addFailure(address: string, error: string) {
        this._failures[address] = error;
    }

    getResponse(address: string): LinearResponse | undefined {
        return this._responses[address];
    }

    private addResponse(address: string, response: LinearResponse) {
        this._responses[address] = response;
    }

    async completePhase(responses: PhaseResponse) {
        Object.entries(responses.failures).forEach(([address, error]) => 
            this.addFailure(address, error));

        Object.entries(responses.results).forEach(([address, response]) => 
            this.addResponse(address, response));

        this._phaseTime = Math.max(responses.actualTime, this._phaseTime);    // (don't allow a quickly returning depth prevent giving time for propagation)
    }
}