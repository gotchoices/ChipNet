import { INetwork } from "../network";
import { LinearParticipantOptions } from "./participant-options";
import { ILinearParticipantState, LinearMatchResult, LinearSegment } from "./participant-state";
import { LinearQuery } from "./query";

export class SimpleLinearParticipantState implements ILinearParticipantState {
    private _cycles: LinearSegment[] = [];
    
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
}