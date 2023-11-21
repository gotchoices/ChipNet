import { decryptObject, encryptObject } from "../hiding";
import { SendLinearResponse } from "../network";
import { Path } from "../path";
import { waitPhase } from "../phase";
import { nonceFromLink } from "../query-id";
import { ILinearParticipantState } from "./participant-state";
import { LinearSearchResult } from "./linear-match";
import { LinearSegment } from "./linear-segment";
import { LinearQuery } from "./query";
import { LinearResponse } from "./response";

interface UnhiddenCandidate {
    l: string,      // link
    t: any,         // terms
    h?: Uint8Array,  // hidden data
}

interface UnhiddenQueryData {
    d: number,      // Depth - will be 1 after first query
    c: UnhiddenCandidate[],   // Candidate segments
    qid: string,    // QueryID - should match query.QueryId
    ct: number,      // Current time
    td?: number,     // Total duration (undefined = 0)
}

interface UnhiddenPathData {
    l: string,      // link
    t: any,         // terms
    //qid: string,    // QueryID - TODO: do we need this?
    ct: number,      // Current time
}

export class LinearParticipant {
    constructor(
        private state: ILinearParticipantState
    ) {}
    
    async query(path: string[], query: LinearQuery, hiddenReentrance?: Uint8Array) {
        if (!hiddenReentrance) {
            return await this.queryFirst(path, query);
        } else {
            return await this.queryNext(path, query, hiddenReentrance);
        }
    }

    async queryFirst(path: string[], query: LinearQuery) {
        const matches = await this.state.search(query);
        if (matches.matches.length) {
            const paths = matches.matches.map(m => {
                // TODO: what else do lifts need?
                const hiddenPath = encryptObject({ 
                        l: m.link, 
                        t: m.terms,
                        //qid: query.queryId,  TODO: Needed?
                        ct: Date.now(),
                    } as UnhiddenPathData, 
                    this.state.options.key);
                return { hiddenPath, terms: m.terms } as Path;
            });
            return { paths } as SendLinearResponse;
        }
        const candidates = await this.filterCandidates(matches.candidates, path, query);
        return { 
            paths: [], 
            hiddenReentrance: encryptObject({
                    d: 1, 
                    c: candidates.map(c => ({ l: c.link, t: c.terms } as UnhiddenCandidate)), 
                    qid: query.queryId, 
                    ct: Date.now() 
                } as UnhiddenQueryData, 
                this.state.options.key) 
        } as SendLinearResponse;
    }

    private async filterCandidates(candidates: LinearSegment[], path: string[], query: LinearQuery) {
        const cycles = candidates.filter(c => path.includes(nonceFromLink(c.link, query.queryId)));
        if (cycles.length) {
            await this.state.reportCycles(cycles);
        }
        return candidates.filter(c => !cycles.some(cy => cy.link === c.link));
        // TODO: additional screaning of candidates based on various policies
    }

    async queryNext(path: string[], query: LinearQuery, hiddenReentrance: Uint8Array): Promise<SendLinearResponse> {
        const reentrance = decryptObject(hiddenReentrance, this.state.options.key);
        if (!this.validateNext(path, query, reentrance)) {
            return { paths: [] } as SendLinearResponse;
        }
        const requests = reentrance.c.map(c => 
            this.state.options.network.sendLinear(c.a, [...path, nonceFromLink(c.a, query.queryId)], query, c.h));

        const phaseResponse = await waitPhase(reentrance.d, requests, this.state.options.phaseOptions);

        await this.state.completePhase(phaseResponse);

        // TODO: filter out candidates that haven't replied in time
        // TODO: package up the results
        return { paths: phaseResponse.results.flatMap(r => r.paths) } as SendLinearResponse;
    }

    private validateNext(path: string[], query: LinearQuery, reentrance: any) {
        // Ensure that the depth mathes the length of the path
        if (reentrance.d !== path.length) {
            return false;
        }
        // Ensure that the queryId matches
        if (reentrance.qid !== query.queryId) {
            return false;
        }
        // Ensure that the time is not too old
        if (reentrance.t < Date.now() - this.state.options.maxAgeGap) {
            return false;
        }
        // TODO: ensure that this query ID hasn't been seen at a different depth or with different criteria recently
        return true;
    }
}

