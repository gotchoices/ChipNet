import { decryptObject, encryptObject } from "../hiding";
import { SendLinearResponse } from "../network";
import { waitPhase } from "../phase";
import { LinearLink, LinearRoute, LinearSegment } from "../route";
import { nonceFromLink } from "../transaction-id";
import { ILinearParticipantState } from "./participant-state";
import { LinearQuery } from "./query";
import { LinearRequest } from "./request";

interface UnhiddenCandidate {
    /** Link identifier */
    l: string,
    /** Terms */
    t: any,
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

export class LinearParticipant {
    constructor(
        private state: ILinearParticipantState
    ) {}
    
    async query(path: LinearRoute, query: LinearQuery, hiddenReentrance?: Uint8Array) {
        if (!hiddenReentrance) {
            return await this.queryFirstPhase(path, query);
        } else {
            return await this.queryNextPhase(path, query, hiddenReentrance);
        }
    }

    async queryFirstPhase(path: LinearRoute, query: LinearQuery) {
        const matches = await this.state.search(path, query);
        if (matches.route) {
            return { routes: [matches.route] } as SendLinearResponse;
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
        } as SendLinearResponse;
    }

    /** Eliminate cycles from the candidates, and report them. */
    private async filterCandidates(candidates: LinearLink[], path: LinearRoute, query: LinearQuery) {
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

    async queryNextPhase(path: LinearRoute, query: LinearQuery, hiddenReentrance: Uint8Array): Promise<SendLinearResponse> {
        const reentrance = decryptObject(hiddenReentrance, this.state.options.key) as UnhiddenQueryData;
        if (!this.validateNext(path, query, reentrance)) {
            return { routes: [] } as SendLinearResponse;
        }

        // TODO: restore candidates from state that didn't complete in time

        const requests = this.candidateRequests(path, query, reentrance.c);

        const phaseResponse = await waitPhase(reentrance.d, requests, this.state.options.phaseOptions);

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
        } as SendLinearResponse;
    }
    
    candidateRequests(path: LinearRoute, query: LinearQuery, candidates: UnhiddenCandidate[]) {
        return candidates.map(c => 
            new LinearRequest(c.l, 
                this.state.options.network.sendLinear(c.l, [...path, { nonce: nonceFromLink(c.l, query.transactionId), terms: c.t }], query, c.h))
            ).reduce((c, r) => { c[r.link] = r; return c; }, {} as Record<string, LinearRequest>)
    }

    private validateNext(path: LinearRoute, query: LinearQuery, reentrance: UnhiddenQueryData) {
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

