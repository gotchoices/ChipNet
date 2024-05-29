import { AsymmetricVault, CryptoHash } from "chipcryptbase";
import { Sparstogram } from "sparstogram";
import { ActiveQuery, PeerState, QueryCandidate, QueryContext, UniParticipantOptions, UniParticipantState, UniQuery } from ".";
import { Intent, Member, NegotiatePlanFunc, Plan, QueryRequest, QueryResponse, QueryStats, Reentrance, appendPath, budgetedStep, intentsSatisfied, prependParticipant } from "..";
import { Pending } from "../pending";

export class UniParticipant {
	constructor(
		public readonly options: UniParticipantOptions,
		public readonly state: UniParticipantState,
		public readonly asymmetricVault: AsymmetricVault,
		public readonly cryptoHash: CryptoHash,
		public getPeerState: () => Promise<PeerState>,
	) { }

	async query(request: QueryRequest, linkId?: string): Promise<QueryResponse> {
		if (request.first) {
			return await this.firstQuery(request.first.plan, request.first.query, request.budget, linkId);
		} else if (request.reentrance) {
			return await this.reenter(request.reentrance, request.budget, linkId);
		} else {
			throw new Error("Invalid request");
		}
	}

	/** First attempt (depth 1) search through this node */
	private async firstQuery(plan: Plan, query: UniQuery, budget: number, linkId?: string): Promise<QueryResponse> {
		const t2 = Date.now();

		await this.validateQuery(plan, query, linkId);
		const fullPath = plan.path.map(p => p.nonce);
		await this.state.validateNewQuery(query.sessionCode, fullPath);	// Note: throws if there's already a query in progress

		const context = await this.createContext(plan, query, linkId);	// Also searches or enumerates candidates

		const plans = this.processAndFilterPlans(context.plans || [], query);

		const isSatisfied = intentsSatisfied(query.intents, plans);
		const newStateContext = isSatisfied
			? { ...context, plans } as QueryContext
			: {
				...context,
				plans,
				activeQuery: context.activeQuery ? {
					...context.activeQuery,
					candidates: context.activeQuery?.candidates ? await this.processAndFilterCandidates(context.activeQuery.candidates, plan, query) : [],
				} as ActiveQuery : undefined
			} as QueryContext;
		await this.state.saveContext(newStateContext, fullPath);

		const duration = Date.now() - t2;
		const stats = { earliest: duration, latest: duration, gross: duration, outstanding: 0, timings: [{ value: duration, variance: 0, count: 1 }] } as QueryStats;
		return {
			...(plans?.length ? { plans: await this.prependParticipant(plans) } : {}),
			reentrance: !isSatisfied && newStateContext.activeQuery?.candidates.length
				? { sessionCode: query.sessionCode, path: fullPath }
				: undefined,
			stats
		} as QueryResponse;
	}

	/** negotiate intents and plans for any matches, then filter any with rejected intents or plans */
	private processAndFilterPlans(matches: Plan[], query: UniQuery) {
		if (!matches.length) {
			return [];
		}
		// For each match, compute which intent types are supported across the entire path
		const supportedIntentCodes = matches.map(plan => {
			const firstCodes = Array.from(plan.path[0].intents.reduce((p, c) => p.add(c.code), new Set<string>()));
			return firstCodes.filter(code => plan.path.every(link => link.intents.some(intent => intent.code === code)));
		});
		const allSupported = matches
			.map((plan) => ({
				...plan,
				path: plan.path.map(link => ({ ...link, intents: link.intents.map(intent => this.options.negotiateIntent(intent, query.intents)).filter(Boolean) as Intent[] }))
			}))
			// Filter any intents from plans that aren't supported by all links in the path
			.map((plan, i) => ({
				...plan,
				path: plan.path.map(link => ({ ...link, intents: link.intents.filter(intent => supportedIntentCodes[i].includes(intent.code)) }))
			}))
			// Filter out plans that have no intents
			.filter(plan => plan.path.every(p => p.intents.length));
		const plans = allSupported
			// Negotiate the plan (ie. vet and/or add external referees if needed)
			.map(p => this.getNegotiatePlan()(p))
			// Filter out any plans that were rejected by the negotiation
			.filter(Boolean) as Plan[];
		this.state.trace?.('plan filter', `matches=${matches.length} results=${plans.length}`);	// `matches=${matches.map(p => p.path.map(l => l.nonce).join(',')).join('; ')
		return plans;
	}

	private async processAndFilterCandidates(candidates: QueryCandidate[], plan: Plan, query: UniQuery) {
		// Determine any eligible intents and include nonces for all candidates
		const resolvedCandidates = await Promise.all(candidates
			.map(candidate => ({ ...candidate, intents: (candidate.intents ?? []).map(intent => this.options.negotiateIntent(intent, query.intents)).filter(Boolean) }))
			.filter(({ intents }) => intents?.length)	// Filter out candidates with no eligible intents
			.map(async candidate => ({ candidate, nonce: await this.cryptoHash.makeNonce(candidate.linkId, query.sessionCode) }))
		);

		// Detect cycles in the candidates
		const cycles = new Set<string>(
			resolvedCandidates
				.filter(c => plan.path.some(p => p.nonce === c.nonce))
				.map(c => c.candidate.linkId)
		);

		// Report cycles
		if (cycles.size) {
			void this.state.reportCycles(query, plan.path.map(p => p.nonce), [...cycles]);	// Fire and forget
		}

		const results = resolvedCandidates.filter(c => !cycles.has(c.nonce)).map(c => c.candidate);

		this.state.trace?.('candidate filter', `candidates=${candidates.length} results=${results.length}`);	// `candidates=${candidates.map(c => c.linkId).join(', ')

		return results;
	}

	/** Query has already passed through this node.  Search one level further. */
	async reenter(reentrance: Reentrance, budget: number, linkId?: string): Promise<QueryResponse> {
		const t2 = Date.now();

		// Restore and validate the context
		await this.validateTicket(reentrance);
		const context = await this.state.getContext(reentrance.sessionCode, reentrance.path);
		await this.validateQueryState(reentrance, context, linkId);
		const active = context!.activeQuery!;

		// Time has elapsed since last query.  Check for successful responses in outstanding requests before proceeding to another step
		const withRequests = active.candidates.filter(c => c.request);
		const outstanding = withRequests.filter(c => !c.request!.isComplete);
		const completed = withRequests.filter(c => c.request!.isComplete);
		const earlyPlans = this.plansFromCandidates(completed);
		if (intentsSatisfied(context.query.intents, earlyPlans)) {
			this.state.trace?.('early exit', `session=${reentrance.sessionCode} link=${linkId} plans=${earlyPlans.map(p => p.path.map(l => l.nonce).join(',')).join('; ')}`);
			const stats = { earliest: Infinity, latest: 0, gross: 0, outstanding: 0, timings: [] } as QueryStats;	// no stats - out of phase
			return await this.endReentrance(context, active, t2, stats, true, earlyPlans, reentrance);
		}

		// Candidates that have never been tried, or have responded and we can reenter
		const toRequestWithNonces = await Promise.all(
			active.candidates
				.filter(({ request: r }) => !r || (r && r.isResponse && r.response!.reentrance))
				.map(async candidate => [candidate, await this.cryptoHash.makeNonce(candidate.linkId, context.query.sessionCode)] as const)
		);

		// Make next batch of requests
		const timings = new Sparstogram(this.options.timingStatBuckets);
		const extremes = { earliest: Infinity, latest: 0 };
		const newRequests = Object.fromEntries(
			toRequestWithNonces.map(([c, nonce]) => [c.linkId,
			new Pending(
				this.options.queryPeer(c.request
					? {
						reentrance: { ...reentrance, path: [...reentrance.path, nonce] },
						budget: budget - (c.request.duration! - c.request.response!.stats.gross)
					}
					: { first: { plan: appendPath(context.plan, { nonce, intents: c.intents! }), query: context.query }, budget },
					c.linkId
				).then(r => {
					if (c.depth === active.depth) {	// Only affect timings if in-phase
						this.captureTiming(t2, r.stats, timings, extremes,
							() => void this.state.reportTimingViolation(context.query, reentrance.path),	// Fire and forget
						)
					}
					return r;
				})
			)]));

		// Process the step (query sub-nodes)
		const requests = { ...newRequests, ...Object.fromEntries(outstanding.map(c => [c.linkId, c.request!])) };
		await budgetedStep(1000, requests);
		//await budgetedStep(budget - (Date.now() - t2), requests);

		const stats = { ...extremes, gross: 0, outstanding: Object.keys(requests).length, timings: Array.from(timings.ascending()) } as QueryStats;
		const newActive = { ...active, candidates: active.candidates.map(c => ({ ...c, request: newRequests[c.linkId] ?? c.request, depth: newRequests[c.linkId] ? c.depth + 1 : c.depth })) } as ActiveQuery;
		const plans = this.plansFromCandidates(newActive.candidates);
		const isSatisfied = intentsSatisfied(context.query.intents, plans);
		return await this.endReentrance(context, newActive, t2, stats, isSatisfied, plans, reentrance);
	}

	private async endReentrance(context: QueryContext, active: ActiveQuery, t2: number, stats: QueryStats, isSatisfied: boolean, plans: Plan[], reentrance: Reentrance) {
		const candidates = active.candidates.filter(({ request: r }) => !r || !r.isError || !r.isResponse || r.response!.reentrance); // Only keep candidates showing promise
		const newState = isSatisfied
			? { ...context, plans } as QueryContext
			: { ...context, activeQuery: { ...active, depth: active.depth + 1, candidates } as ActiveQuery } as QueryContext;
		await this.state.saveContext(newState, reentrance.path);

		stats.gross = Date.now() - t2;
		return {
			...(plans?.length ? { plans: await this.prependParticipant(plans) } : {}),
			reentrance: newState.activeQuery?.candidates.length	// Can reenter if there are still potential candidates
				? reentrance
				: undefined,
			stats
		} as QueryResponse;
	}

	/** Creates a query context for the given under-construction plan and query, including searching and enumerating candidates */
	private async createContext(
		plan: Plan,
		query: UniQuery,
		linkId?: string,
	): Promise<QueryContext> {
		const peerState = await this.getPeerState();
		const plans = await peerState.search(plan, query);
		if (plans?.length && this.state.trace) {
			this.state.trace('search', `node=${peerState.selfAddress} plans=${plans.map(p => p.path.map(l => l.nonce).join(',')).join('; ')}`);
		}
		if (plans?.length && intentsSatisfied(query.intents, plans)) {
			this.state.trace?.('satisfied', `intents=${query.intents.map(i => i.code).join(', ')}`);
			return { plan, query, plans };
		} else {
			const links = await peerState.getCandidates(plan, query);
			const candidates = links.map(l => ({ linkId: l.id, intents: l.intents, depth: 1 } as QueryCandidate));
			this.state.trace?.('candidates', `candidates=${candidates.map(c => c.linkId).join(', ')}`);
			return {
				plan,
				query,
				...(plans?.length ? { plans } : {}),
				activeQuery: { depth: 1, candidates },
				linkId,
			};
		}
	}

	private captureTiming(t2: number, stats: QueryStats, timings: Sparstogram, extremes: { earliest: number, latest: number }, reportViolation: () => void) {
		const duration = Date.now() - t2;
		if (stats.gross > duration || stats.timings.some(cent => cent.value > duration)) {	// Sub-query took longer than this query
			reportViolation?.();
			return;
		}
		const overhead = duration - stats.gross;	// Network and processing round-trip time
		// Adjust sub-timings for overhead and add to our timings
		timings.append(...stats.timings.map(cent => ({ ...cent, value: cent.value + overhead })));
		extremes.earliest = Math.min(extremes.earliest, duration);
		extremes.latest = Math.max(extremes.latest, duration);
	}

	private async prependParticipant(plans: Plan[]) {
		const key = await this.asymmetricVault.getPublicKeyAsString();
		const participant: Member = {
			types: this.options.selfReferee ? [1, 2] : [1],
			secret: this.options.selfSecret,
		};
		return plans.map(p => prependParticipant(p, key, participant));
	}

	private async validateTicket(ticket: Reentrance) {
		if (this.cryptoHash.isExpired(ticket.sessionCode)) {
			throw new Error("Query session expired");
		}
	}

	private async validateQuery(plan: Plan, query: UniQuery, linkId?: string) {
		if (!this.cryptoHash.isValid(query.sessionCode)) {
			throw new Error("Invalid or expired session code");
		}
		if (!linkId) {
			// Validate that if the linkId isn't provided, the plan is also empty (this is the originator)
			if (plan.path.length) {
				throw new Error("Link ID required for non-empty plan");
			}
		} else {
			// Validate that since a link is provided, there should be at least one entry in the path
			if (!plan.path.length) {
				throw new Error("Plan required for non-empty link ID");
			}
			// Validate that plan's ending nonce matches the linkId provided
			const linkNonce = await this.cryptoHash.makeNonce(linkId, query.sessionCode);
			if (plan.path.length && plan.path[plan.path.length - 1].nonce !== linkNonce) {
				throw new Error("Link ID doesn't match plan");
			}
		}
	}

	private async validateQueryState(ticket: Reentrance, context?: QueryContext, linkId?: string) {
		// Verify that we haven't already given a concluding response for the query
		const active = context?.activeQuery;
		if (!active) {
			throw new Error(`Query already complete for session (${ticket.sessionCode}).`);
		}
		// validate that the depth isn't too deep
		if (active.depth >= this.options.maxDepth) {	// Assume we're going one deeper than prior context
			throw new Error(`Query depth (${active.depth}) exceeds maximum (${this.options.maxDepth})`);
		}
		// validate that the query and plan match
		if (context.query.sessionCode !== ticket.sessionCode) {
			throw new Error(`Session code mismatch for ticket and persisted context.`);
		}
		// validate that if the linkId is absent, the plan's path is also empty; if linkId is present, it's nonce should match the tail entry in the plan's path
		if (linkId) {
			if (!context.plan.path.length || context.plan.path[context.plan.path.length - 1].nonce !== await this.cryptoHash.makeNonce(linkId, ticket.sessionCode)) {
				throw new Error("Incoming link Id doesn't match plan's path");	// Probably shouldn't disclose any Ids in the error message in case the error is relayed
			}
		} else if (context.plan.path.length) {
			throw new Error("Incoming link Id required for non-empty plan");
		}
	}

	private plansFromCandidates(candidates: QueryCandidate[]) {
		return candidates.filter(({ request: r }) => r?.isResponse && r!.response!.plans?.length)
			.flatMap(({ request: r }) => r!.response!.plans!)
			.map(p => this.getNegotiatePlan()(p))
			.filter(p => p) as Plan[];
	}

	private getNegotiatePlan(): NegotiatePlanFunc {
		return this.options.negotiatePlan ?? this.getDefaultNegotiatePlan();
	}

	private getDefaultNegotiatePlan(): NegotiatePlanFunc {
		return (plan: Plan) => {
			// TODO: Equalize to least denominator terms (will have to be a callback)
			return this.options.otherMembers?.length
				? { ...plan, members: concatMembers(plan.members, this.options.otherMembers ?? {}) }
				: plan;
		};
	}
}

/** @returns Deduplicated union of members */
function concatMembers(members1: Record<string, Member>, members2: Record<string, Member>) {
	const result: Record<string, Member> = { ...members1 };
	for (const key in members2) {
		if (Object.prototype.hasOwnProperty.call(members1, key)) {
			const member1 = members1[key];
			const member2 = members2[key];
			const types = Array.from(new Set([...member1.types, ...member2.types]));
			result[key] = { ...member1, types };
		} else {
			result[key] = members2[key];
		}
	}
	return result;
}
