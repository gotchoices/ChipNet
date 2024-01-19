import { SendUniResponse } from "./callbacks";
import { sequenceStep } from "../sequencing";
import { PrivateLink } from "../private-link";
import { Terms } from "../types";
import { UniParticipantState } from "./participant-state";
import { UniQuery } from "./query";
import { UniRequest } from "./request";
import { Plan, PublicLink } from "../plan";
import { makeNonce } from "chipcode";
import { Symmetric } from "chipcryptbase";

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
	/** SessionCode - should match query.SessionCode */
	sc: string,
	/** Current time */
	ct: number,
	/** Last duration (undefined = 0) */
	ld?: number,
}

export class UniParticipant {
	constructor(
		private state: UniParticipantState,
		private symmetric: Symmetric,
	) { }

	async query(plan: Plan, query: UniQuery, hiddenReentrance?: Uint8Array) {
		if (!hiddenReentrance) {
			return await this.queryFirstPhase(plan, query);
		} else {
			return await this.queryNextPhase(plan, query, hiddenReentrance);
		}
	}

	private async queryFirstPhase(plan: Plan, query: UniQuery) {
		const matches = await this.state.search(plan, query);
		if (matches.route) {
			return { plans: [matches.route] } as SendUniResponse;
		}
		const resolvedCandidates = await this.resolveCandidates(matches.candidates!, query);
		const candidates = await this.filterCandidates(resolvedCandidates, plan, query);
		return {
			plans: [],
			hiddenReentrance: candidates.length
				? this.symmetric.encryptObject({
					d: 1,
					c: candidates.map(c => ({ l: c.private.id, t: c.public.terms } as UnhiddenCandidate)),
					sc: query.sessionCode,
					ct: Date.now()
				} as UnhiddenQueryData, this.state.options.key)
				: undefined
		} as SendUniResponse;
	}

	private async resolveCandidates(candidates: PrivateLink[], query: UniQuery) {
		return Promise.all(candidates.map(async c => {
			const terms = await this.state.negotiateTerms(c.terms, query.terms);
			const publicLink: PublicLink | undefined = terms ? { nonce: makeNonce(c.id, query.sessionCode), terms } : undefined;
			return { private: c, public: publicLink };
		}));
	}

	private async filterCandidates(candidates: { private: PrivateLink, public: PublicLink | undefined }[], plan: Plan, query: UniQuery) {
		// Only consider candidates that have acceptable terms
		const potentials = candidates.filter(c => c.public);

		// Detect cycles in the candidates
		const cycles = new Set<string>(
			potentials.filter(c => c.public && plan.path.some(p => p.nonce === c.public?.nonce))
				.map(c => c.private.id)
		);

		// Report cycles
		if (cycles.size) {
			await this.state.reportCycles(query, plan.path.map(p => p.nonce), [...cycles]);
		}

		return potentials.filter(c => !cycles.has(c.public!.nonce)) as { private: PrivateLink, public: PublicLink }[];
	}

	private async queryNextPhase(plan: Plan, query: UniQuery, hiddenReentrance: Uint8Array): Promise<SendUniResponse> {
		const reentrance = this.symmetric.decryptObject(hiddenReentrance, this.state.options.key) as UnhiddenQueryData;
		if (!this.validateNext(plan, query, reentrance)) {
			return { plans: [] } as SendUniResponse;
		}

		// TODO: restore candidates from state that didn't complete in time

		const requests = await this.requestsToCandidates(plan, query, reentrance.c);

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
				: this.symmetric.encryptObject({
					d: reentrance.d + 1,
					c: stepResponse.results.map(r => ({ l: r.link, t: reentrance.c.find(c => c.l === r.link)!.t, h: r.hiddenReentrance } as UnhiddenCandidate)),
					sc: query.sessionCode,
					ct: Date.now(),
					ld: stepResponse.actualTime
				} as UnhiddenQueryData,
					this.state.options.key),
		} as SendUniResponse;
	}

	async requestsToCandidates(plan: Plan, query: UniQuery, candidates: UnhiddenCandidate[]) {
		return candidates.map(c => {
				const nextLink = { nonce: makeNonce(c.l, query.sessionCode), terms: c.t } as PublicLink;
				return new UniRequest(c.l,
					this.state.options.sendUni(c.l, { ...plan, path: [...plan.path, nextLink] }, query, c.h))
			})
			.reduce((c, r) => { c[r.link] = r; return c; }, {} as Record<string, UniRequest>);
	}

	private validateNext(plan: Plan, query: UniQuery, reentrance: UnhiddenQueryData) {
		// Ensure that the depth mathes the length of the path
		if (reentrance.d !== plan.path.length) {
			return false;
		}
		// Ensure that the tid matches
		if (reentrance.sc !== query.sessionCode) {
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

