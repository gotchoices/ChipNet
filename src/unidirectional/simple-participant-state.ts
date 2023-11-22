import { INetwork } from "../network";
import { PhaseResponse } from "../phase";
import { LinearLink, LinearRoute, LinearSegment } from "../route";
import { nonceFromLink } from "../transaction-id";
import { Terms } from "../types";
import { LinearParticipantOptions } from "./participant-options";
import { ILinearParticipantState, LinearSearchResult } from "./participant-state";
import { LinearQuery } from "./query";
import { LinearResponse } from "./response";

export class SimpleLinearParticipantState implements ILinearParticipantState {
    private _cycles: string[] = [];
    private _responses: Record<string, LinearResponse> = {};
    private _failures: Record<string, string> = {};  // TODO: structured error information
    private _phaseTime: number = 0;
    
    constructor(
        public options: LinearParticipantOptions,
        public network: INetwork,
        public peerLinks: LinearLink[],
        public matchTerms: (linkTerms: Terms, queryTerms: Terms) => Terms | undefined,
        public peerIdentities?: Record<string, string>,  // Mapping from target identity to link identity
        public selfIdentity?: string,                    // Identity token for this node (should provide this or peerIdentities)
    ) { }
    
    async reportCycles(collisions: string[]) {
        this._cycles.push(...collisions);
    }

    async search(path: LinearRoute, query: LinearQuery) {
        const route = await this.getMatch(path, query);
        const candidates = route ? undefined : await this.getCandidates(query);
        return { route, candidates } as LinearSearchResult;
    }

    private async getMatch(path: LinearRoute, query: LinearQuery) {
        if (this.selfIdentity === query.target) {
            return [] as LinearRoute;
        }
        const linkId = this.peerIdentities ? this.peerIdentities[query.target] : undefined;
        const match = this.peerLinks[linkId] as LinearLink | undefined;
        return match 
            ? [...path, { nonce: nonceFromLink(match.id, query.transactionId), terms: match.terms } as LinearSegment] as LinearRoute 
            : undefined;
    }

    private async getCandidates(query: LinearQuery): Promise<LinearLink[]> {
        return this.peerLinks.map(link => ({ id: link.id, terms: this.matchTerms(link.terms, query.terms) } as LinearLink))
            .filter(l => l.terms);
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