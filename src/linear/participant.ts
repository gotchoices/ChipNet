import { decryptObject, encryptObject } from "../hiding";
import { SendLinearResponse } from "../network";
import { Path } from "../path";
import { nonceFromAddress } from "../query-id";
import { ILinearParticipantState } from "./participant-state";
import { LinearQuery } from "./query";

export interface UnhiddenCandidate {
    a: string,      // address
    m: any,         // metadata
    h?: Uint8Array,  // hidden data
}

export interface UnhiddenQueryData {
    d: number,      // Depth - will be 1 after first query
    c: UnhiddenCandidate[],   // Candidate segments
    qid: string,    // QueryID - should match query.QueryId
    t: number,      // Current time
}

export interface UnhiddenPathData {
    a: string,      // address
    m: any,         // metadata
    //qid: string,    // QueryID - TODO: do we need this?
    t: number,      // Current time
}

export class LinearParticipant {
    constructor(
        private state: ILinearParticipantState
    ) {}
    
    async query(path: string[], query: LinearQuery, hiddenData?: Uint8Array) {
        if (!hiddenData) {
            return await this.queryFirst(path, query);
        } else {
            return await this.queryNext(path, query, hiddenData);
        }
    }

    async queryFirst(path: string[], query: LinearQuery) {
        const matches = await this.state.getMatches(query);
        if (matches.matches.length) {
            const paths = matches.matches.map(m => {
                // TODO: what else do lifts need?
                const hiddenData = encryptObject({ 
                        a: m.address, 
                        m: m.metadata,
                        //qid: query.queryId,  TODO: Needed?
                        t: Date.now() 
                    } as UnhiddenPathData, 
                    this.state.options.key);
                return { hiddenData, metadata: m.metadata } as Path;
            });
            return { paths } as SendLinearResponse;
        }
        const cycles = matches.candidates.filter(c => path.includes(nonceFromAddress(c.address, query.queryId)));
        if (cycles.length) {
            await this.state.reportCycles(cycles);
        }
        // TODO: additional screaning of candidates based on various policies
        const candidates = matches.candidates.filter(c => !cycles.some(cy => cy.address === c.address));
        return { 
            paths: [], 
            hiddenData: encryptObject({
                    d: 1, 
                    c: candidates.map(c => ({ a: c.address, m: c.metadata } as UnhiddenCandidate)), 
                    qid: query.queryId, 
                    t: Date.now() 
                } as UnhiddenQueryData, 
                this.state.options.key) 
        } as SendLinearResponse;
    }

    async queryNext(path: string[], query: LinearQuery, hiddenData: Uint8Array): Promise<SendLinearResponse> {
        const unhiddenData = decryptObject(hiddenData, this.state.options.key);
        if (!this.validateNext(path, query, unhiddenData)) {
            return { paths: [] } as SendLinearResponse;
        }
        // TODO: pass on the query to the candidates
        // TODO: filter out candidates that haven't replied in time
        // TODO: package up the results
    }

    private validateNext(path: string[], query: LinearQuery, unhiddenData: any) {
        // Ensure that the depth mathes the length of the path
        if (unhiddenData.d !== path.length) {
            return false;
        }
        // Ensure that the queryId matches
        if (unhiddenData.qid !== query.queryId) {
            return false;
        }
        // Ensure that the time is not too old
        if (unhiddenData.t < Date.now() - this.state.options.maxAgeGap) {
            return false;
        }
        return true;
    }
}
