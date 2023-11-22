import { decryptObject, encryptObject } from "../hiding";
import { SendUniResponse } from "../network";
import { waitPhase } from "../phase";
import { UniLink, UniRoute, UniSegment } from "../route";
import { nonceFromLink } from "../transaction-id";
import { Terms } from "../types";
import { IUniParticipantState } from "./participant-state";
import { UniQuery } from "./query";
import { UniRequest } from "./request";

interface UnhiddenCandidate {
    /** Link identifier */
    l: string,
    /** Terms */
    t: Terms,
    /** Hidden data */
    h?: Uint8Array,
}

interface UnhiddenQueryData {
    /** Depth - will be 1 after first query */
    d: number,
    /** Candidates */
    c: UnhiddenCandidate[],
    /** TransactionID - should match query.TransactionId */
    tid: string,
    /** Current time */
    ct: number,
    /** Last duration (undefined = 0) */
    ld?: number,
}

export class UniParticipant {
    constructor(
        private state: IUniParticipantState
    ) {}
    
    async query(path: UniRoute, query: UniQuery, hiddenReentrance?: Uint8Array) {
        if (!hiddenReentrance) {
            return await this.queryFirstPhase(path, query);
        } else {
            return await this.queryNextPhase(path, query, hiddenReentrance);
        }
    }

    async queryFirstPhase(path: UniRoute, query: UniQuery) {
        const matches = await this.state.search(path, query);
        if (matches.route) {
            return { routes: [matches.route] } as SendUniResponse;
        }
        const candidates = await this.filterCandidates(matches.candidates, path, query);
        return { 
            routes: [], 
            hiddenReentrance: encryptObject({
                    d: 1, 
                    c: candidates.map(c => ({ l: c.id, t: c.terms } as UnhiddenCandidate)), 
                    tid: query.transactionId, 
                    ct: Date.now() 
                } as UnhiddenQueryData, 
                this.state.options.key) 
        } as SendUniResponse;
    }

    /** Eliminate cycles from the candidates, and report them. */
    private async filterCandidates(candidates: UniLink[], path: UniRoute, query: UniQuery) {
        const cycles: Record<string, boolean> = {};
        candidates.forEach(c => {
            const nonce = nonceFromLink(c.id, query.transactionId);
            if (path.some(p => p.nonce === nonce)) {
                cycles[nonce] = true;
            }
        });

        
        if (Object.keys(cycles).length) {
            await this.state.reportCycles(Object.keys(cycles));
        }
        
        return candidates.filter(c => !cycles[nonceFromLink(c.id, query.transactionId)]);
    }

    async queryNextPhase(path: UniRoute, query: UniQuery, hiddenReentrance: Uint8Array): Promise<SendUniResponse> {
        const reentrance = decryptObject(hiddenReentrance, this.state.options.key) as UnhiddenQueryData;
        if (!this.validateNext(path, query, reentrance)) {
            return { routes: [] } as SendUniResponse;
        }

        // TODO: restore candidates from state that didn't complete in time

        const requests = this.candidateRequests(path, query, reentrance.c);

        const baseTime = Math.max((reentrance.d - 1) * this.state.options.phaseOptions.minTime, reentrance.ld ?? 0);
        const phaseResponse = await waitPhase(baseTime, requests, this.state.options.phaseOptions);

        await this.state.completePhase(phaseResponse);

        const routes = phaseResponse.results.flatMap(r => r.routes);

        if (!routes.length) {
            // TODO: persist to state candidates that haven't completed in time
        }

        return { 
            routes,
            unhiddenReentrance: routes.length 
                ? undefined 
                : encryptObject({
                        d: reentrance.d + 1, 
                        c: phaseResponse.results.map(r => ({ l: r.link, t: reentrance.c.find(c => c.l === r.link).t, h: r.hiddenReentrance } as UnhiddenCandidate)), 
                        tid: query.transactionId, 
                        ct: Date.now(),
                        ld: phaseResponse.actualTime
                    } as UnhiddenQueryData, 
                    this.state.options.key),
        } as SendUniResponse;
    }
    
    candidateRequests(path: UniRoute, query: UniQuery, candidates: UnhiddenCandidate[]) {
        return candidates.map(c => 
            new UniRequest(c.l, 
                this.state.options.network.sendUni(c.l, [...path, { nonce: nonceFromLink(c.l, query.transactionId), terms: c.t }], query, c.h))
            ).reduce((c, r) => { c[r.link] = r; return c; }, {} as Record<string, UniRequest>)
    }

    private validateNext(path: UniRoute, query: UniQuery, reentrance: UnhiddenQueryData) {
        // Ensure that the depth mathes the length of the path
        if (reentrance.d !== path.length) {
            return false;
        }
        // Ensure that the tid matches
        if (reentrance.tid !== query.transactionId) {
            return false;
        }
        // Ensure that the time is not too old
        if (reentrance.ct < Date.now() - this.state.options.maxAgeGap) {
            return false;
        }
        // TODO: ensure that this query ID hasn't been seen at a different depth or with different criteria recently
        return true;
    }
}

