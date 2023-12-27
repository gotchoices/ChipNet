import { decryptObject, encryptObject } from "../symmetric";
import { SendUniResponse } from "./callbacks";
import { sequenceStep } from "../sequencing";
import { PrivateLink } from "../private-link";
import { nonceFromLink } from "../session-id";
import { Terms } from "../types";
import { UniParticipantState } from "./participant-state";
import { UniQuery } from "./query";
import { UniRequest } from "./request";
import { Plan } from "../plan";

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
    /** SessionID - should match query.SessionId */
    sid: string,
    /** Current time */
    ct: number,
    /** Last duration (undefined = 0) */
    ld?: number,
}

export class UniParticipant {
    constructor(
        private state: UniParticipantState
    ) {}

    async query(plan: Plan, query: UniQuery, hiddenReentrance?: Uint8Array) {
        if (!hiddenReentrance) {
            return await this.queryFirstPhase(plan, query);
        } else {
            return await this.queryNextPhase(plan, query, hiddenReentrance);
        }
    }

    async queryFirstPhase(plan: Plan, query: UniQuery) {
        const matches = await this.state.search(plan, query);
        if (matches.route) {
            return { plans: [matches.route] } as SendUniResponse;
        }
        const candidates = await this.filterCandidates(matches.candidates, plan, query);
        return {
            plans: [],
            hiddenReentrance: encryptObject({
									d: 1,
									c: candidates.map(c => ({ l: c.id, t: c.terms } as UnhiddenCandidate)),
									sid: query.sessionId,
									ct: Date.now()
							} as UnhiddenQueryData,
							this.state.options.key)
        } as SendUniResponse;
    }

    /** Eliminate cycles from the candidates, and report them. */
    private async filterCandidates(candidates: PrivateLink[], plan: Plan, query: UniQuery) {
        const cycles: Record<string, boolean> = {};
        candidates.forEach(c => {
            const nonce = nonceFromLink(c.id, query.sessionId);
            if (plan.path.some(p => p.nonce === nonce)) {
                cycles[nonce] = true;
            }
        });


        if (Object.keys(cycles).length) {
            await this.state.reportCycles(Object.keys(cycles));
        }

        return candidates.filter(c => !cycles[nonceFromLink(c.id, query.sessionId)]);
    }

    async queryNextPhase(plan: Plan, query: UniQuery, hiddenReentrance: Uint8Array): Promise<SendUniResponse> {
        const reentrance = decryptObject(hiddenReentrance, this.state.options.key) as UnhiddenQueryData;
        if (!this.validateNext(plan, query, reentrance)) {
            return { plans: [] } as SendUniResponse;
        }

        // TODO: restore candidates from state that didn't complete in time

        const requests = this.candidateRequests(plan, query, reentrance.c);

        const baseTime = Math.max((reentrance.d - 1) * this.state.options.stepOptions.minTime, reentrance.ld ?? 0);
        const stepResponse = await sequenceStep(baseTime, requests, this.state.options.stepOptions);

        await this.state.completeStep(stepResponse);

        let plans = stepResponse.results.flatMap(r => r.plans);

        if (plans.length) {
					plans = await Promise.all(plans.map(p => this.state.negotiatePlan(p)));
				} else {
            // TODO: persist to state candidates that haven't completed in time
        }

        return {
            plans,
            unhiddenReentrance: plans.length
                ? undefined
                : encryptObject({
                        d: reentrance.d + 1,
                        c: stepResponse.results.map(r => ({ l: r.link, t: reentrance.c.find(c => c.l === r.link).t, h: r.hiddenReentrance } as UnhiddenCandidate)),
                        sid: query.sessionId,
                        ct: Date.now(),
                        ld: stepResponse.actualTime
                    } as UnhiddenQueryData,
                    this.state.options.key),
        } as SendUniResponse;
    }

    candidateRequests(plan: Plan, query: UniQuery, candidates: UnhiddenCandidate[]) {
        return candidates.map(c =>
            new UniRequest(c.l,
                this.state.options.sendUni(c.l, { ...plan, path: [...plan.path, { nonce: nonceFromLink(c.l, query.sessionId), terms: c.t }] }, query, c.h))
            ).reduce((c, r) => { c[r.link] = r; return c; }, {} as Record<string, UniRequest>)
    }

    private validateNext(plan: Plan, query: UniQuery, reentrance: UnhiddenQueryData) {
        // Ensure that the depth mathes the length of the path
        if (reentrance.d !== plan.path.length) {
            return false;
        }
        // Ensure that the tid matches
        if (reentrance.sid !== query.sessionId) {
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

