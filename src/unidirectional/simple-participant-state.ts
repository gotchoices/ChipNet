import { INetwork } from "../network";
import { PhaseResponse } from "../phase";
import { UniLink, UniRoute, UniSegment } from "../route";
import { nonceFromLink } from "../transaction-id";
import { Terms } from "../types";
import { UniParticipantOptions } from "./participant-options";
import { IUniParticipantState, UniSearchResult } from "./participant-state";
import { UniQuery } from "./query";
import { UniResponse } from "./response";

export class SimpleUniParticipantState implements IUniParticipantState {
    private _cycles: string[] = [];
    private _responses: Record<string, UniResponse> = {};
    private _failures: Record<string, string> = {};  // TODO: structured error information
    private _phaseTime: number = 0;
    
    constructor(
        public options: UniParticipantOptions,
        public network: INetwork,
        public peerLinks: UniLink[],
        public matchTerms: (linkTerms: Terms, queryTerms: Terms) => Terms | undefined,
        public peerIdentities?: Record<string, string>,  // Mapping from target identity to link identity
        public selfIdentity?: string,                    // Identity token for this node (should provide this or peerIdentities)
    ) { }
    
    async reportCycles(collisions: string[]) {
        this._cycles.push(...collisions);
    }

    async search(path: UniRoute, query: UniQuery) {
        const route = await this.getMatch(path, query);
        const candidates = route ? undefined : await this.getCandidates(query);
        return { route, candidates } as UniSearchResult;
    }

    private async getMatch(path: UniRoute, query: UniQuery) {
        if (this.selfIdentity === query.target) {
            return [] as UniRoute;
        }
        const linkId = this.peerIdentities ? this.peerIdentities[query.target] : undefined;
        const match = this.peerLinks[linkId] as UniLink | undefined;
        return match 
            ? [...path, { nonce: nonceFromLink(match.id, query.transactionId), terms: match.terms } as UniSegment] as UniRoute 
            : undefined;
    }

    private async getCandidates(query: UniQuery): Promise<UniLink[]> {
        return this.peerLinks.map(link => ({ id: link.id, terms: this.matchTerms(link.terms, query.terms) } as UniLink))
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

    getResponse(link: string): UniResponse | undefined {
        return this._responses[link];
    }

    private addResponse(link: string, response: UniResponse) {
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