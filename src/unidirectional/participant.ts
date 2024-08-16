/* eslint-disable @typescript-eslint/no-unused-vars */
import { AsymmetricVault, CryptoHash } from "chipcryptbase";
import { Sparstogram } from "sparstogram";
import { ActiveQuery, QueryCandidate, QueryContext, UniParticipantOptions, UniParticipantState, UniQuery, FindResult, Match } from ".";
import { DependentMember, IdentifiedMember, Intent, IntentSatisfiedFunc, Intents, MemberTypes, NegotiatePlanFunc, Plan, QueryPeerFunc, QueryRequest, QueryResponse, QueryStats, Reentrance, addressesMatch, appendPath, budgetedStep, intentsSatisfied, processIntents } from "..";
import { Pending } from "../pending";
import { Rule, RuleResponse, RuleSet } from "../rule";

export class UniParticipant {
	constructor(
		public readonly options: UniParticipantOptions,
		public readonly state: UniParticipantState,
		public readonly asymmetricVault: AsymmetricVault,
		public readonly cryptoHash: CryptoHash,
		public findAddress: (query: UniQuery) => Promise<FindResult>,
		public readonly intentSatisfied: IntentSatisfiedFunc,
		public queryPeer: QueryPeerFunc,
	) { }

	async query(request: QueryRequest, linkId?: string): Promise<QueryResponse> {
		if (request.entrance) {
			return await this.enter(request.entrance.plan, request.entrance.query, request.budget, linkId);
		} else if (request.reentrance) {
			return await this.reenter(request.reentrance, request.budget, linkId);
		} else {
			throw new Error("Invalid request");
		}
	}

	/** First attempt (depth 1) search through this node */
	private async enter(plan: Plan, query: UniQuery, budget: number, linkId?: string): Promise<QueryResponse> {
		const t2 = Date.now();

		await this.queryRules.runAndCheck(plan, query, linkId);
		const pathToHere = plan.path.map(p => p.nonce);
		await this.state.validateNewQuery(query.sessionCode, pathToHere);	// Note: throws if there's already a query in progress

		const context = await this.createContext(plan, query, linkId);	// Also searches or enumerates candidates
		await this.state.saveContext(context, pathToHere);

		const duration = Date.now() - t2;
		const stats = { earliest: duration, latest: duration, gross: duration, outstanding: 0, timings: [{ value: duration, variance: 0, count: 1 }] } as QueryStats;
		return {
			...(context.plans?.length ? { plans: context.plans } : {}),
			reentrance: context.activeQuery
				? { sessionCode: query.sessionCode, path: pathToHere }
				: undefined,
			stats
		} as QueryResponse;
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
		if (intentsSatisfied(context.query.intents, earlyPlans, this.intentSatisfied)) {
			this.state.trace?.('early exit', `session=${reentrance.sessionCode} link=${linkId} plans=${earlyPlans.map(p => p.path.map(l => l.nonce).join(',')).join('; ')}`);
			const stats = { earliest: Infinity, latest: 0, gross: 0, outstanding: 0, timings: [] } as QueryStats;	// no stats - out of phase
			return await this.endReentrance(context, active, t2, stats, true, earlyPlans, reentrance);
		}

		// Candidates that have never been tried, or have responded and we can reenter
		const toRequest = active.candidates
				.filter(({ request: r }) => !r || (r && r.isResponse && r.response!.reentrance));

		// Make next batch of requests
		const timings = new Sparstogram(this.options.timingStatBuckets);
		const extremes = { earliest: Infinity, latest: 0 };
		const newRequests = Object.fromEntries(
			toRequest.map(c => [c.linkId,
				new Pending(
					this.queryPeer(c.request
						? {
							reentrance: c.request.response!.reentrance,
							budget: budget - (c.request.duration! - c.request.response!.stats.gross)
						}
						: { entrance: { plan: appendPath(context.plan, { nonce: c.nonce, intents: c.intents! }), query: context.query }, budget },
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
		const isSatisfied = intentsSatisfied(context.query.intents, plans, this.intentSatisfied);
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
			...(plans?.length ? { plans: plans.map(p => prependMatch(p, context.self)) } : {}),
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
		const findResult = await this.findAddress(query);

		// generate nonce/linkId mappings for all peers and candidates
		const nonceLinkMap = (
			findResult.candidates
				? await Promise.all(
					findResult.candidates.map(async c => [c.id, await this.cryptoHash.makeNonce(c.id, query.sessionCode)] as const)
				) : []
			).concat((
				findResult.peerMatch
					? await Promise.all(
						findResult.peerMatch?.map(async m => [m.link.id, await this.cryptoHash.makeNonce(m.link.id, query.sessionCode)] as const)
					) : []
			));
		const noncesByLinkId = Object.fromEntries(nonceLinkMap);
		const linkIdsByNonce = Object.fromEntries(nonceLinkMap.map(([linkId, nonce]) => [nonce, linkId]));

		const asyncCandidates =
			findResult.candidates?.map(async c => ({
				linkId: c.id,
				nonce: noncesByLinkId[c.id],
				intents: c.intents,
				depth: 1 } as QueryCandidate));
		const rawCandidates = asyncCandidates ? await Promise.all(asyncCandidates) : undefined;
		const candidates = rawCandidates ? await this.processAndFilterCandidates(rawCandidates, plan, query) : undefined;

		// TODO: only return activeQuery if intents aren't satisfied
		const context = candidates ? { activeQuery: { depth: 1, candidates } } : {};

		const rawPlans =
			(findResult.selfIsMatch)
				? [prependMatch({ sessionCode: query.sessionCode, path: [...plan.path], members: [] } as Plan, findResult.selfMatch)]
				: (findResult.peerMatch?.length)
					? findResult.peerMatch.map(m => prependMatch(
							prependMatch(
								{
									sessionCode: query.sessionCode,
									path: [...plan.path, { nonce: noncesByLinkId[m.link.id], intents: m.link.intents }],
									members: []
								} as Plan,
								m.match),
							findResult.selfMatch))
					: [];
		const plans = this.processAndFilterPlans(rawPlans, query);

		if (this.state.trace) {
			this.state.trace('findAddress', JSON.stringify(findResult));
		}
		return { ...context, plan, query, plans, self: findResult.selfMatch, linkIdsByNonce };
	}

	/** negotiate intents and plans for any matches, then filter any with rejected intents or plans */
	private processAndFilterPlans(matches: Plan[], query: UniQuery) {
		if (!matches.length) {
			return [];
		}
		// For each match, compute which intent types are supported across the entire path
		const supportedIntentCodes = matches.map(plan => {
			const firstCodes = Object.keys(plan.path[0].intents);
			return firstCodes.filter(code => plan.path.every(link => Object.prototype.hasOwnProperty.call(link.intents, code)));
		});
		const allSupported = matches
			.map((plan) => ({
				...plan,
				path: plan.path.map(link => ({
					...link,
					intents: processIntents(link.intents, intents =>
						intents.map(intent => this.options.negotiateIntent(intent, query.intents))
							.filter(Boolean) as Intent[])
				}))
			}))
			// Filter any intents from plans that aren't supported by all links in the path
			.map((plan, i) => ({
				...plan,
				path: plan.path.map(link => ({
					...link,
					intents: processIntents(link.intents, intents =>
						intents.filter(intent => supportedIntentCodes[i].includes(intent.code)))
				}))
			}))
			// Filter out plans that have no intents
			.filter(plan => plan.path.every(p => Object.keys(p.intents).length));

		const plans = allSupported
			// Negotiate the plan (ie. vet and/or add external referees if needed)
			.map(p => this.getNegotiatePlan()(p))
			// Filter out any plans that were rejected by the negotiation
			.filter(Boolean) as Plan[];
		return plans;
	}

	private async processAndFilterCandidates(candidates: QueryCandidate[], plan: Plan, query: UniQuery) {
		// Determine any eligible intents and include nonces for all candidates
		const resolvedCandidates = await Promise.all(candidates
			.map(candidate => ({ ...candidate,
				intents: processIntents(candidate.intents ?? {} as Intents,
					intents => intents.map(intent => this.options.negotiateIntent(intent, query.intents))
						.filter(Boolean) as Intent[])
			}))
			.filter(({ intents }) => intents && Object.keys(intents).length)	// Filter out candidates with no eligible intents
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

	private async validateTicket(ticket: Reentrance) {
		if (this.cryptoHash.isExpired(ticket.sessionCode)) {
			throw new Error("Query session expired");
		}
	}

	readonly queryRules: RuleSet<(plan: Plan, query: UniQuery, linkId?: string) => Promise<RuleResponse>> = new RuleSet([
		new Rule('SessionCode', async (plan: Plan, query: UniQuery) =>
		({
			passed: this.cryptoHash.isValid(query.sessionCode),
			message: `Invalid or expired session code (${query.sessionCode})`
		} as RuleResponse)),
		new Rule('SessionLongevity', async (plan: Plan, query: UniQuery) =>
		({
			passed: this.cryptoHash.getExpiration(query.sessionCode) >= Date.now() + this.options.minSessionMs,
			message: `Session code too short-lived (${query.sessionCode})`
		} as RuleResponse)),
		new Rule('NewPlan', async (plan: Plan, query: UniQuery, linkId?: string) =>
		({
			passed: !plan.path.length,
			message: `Plan must be empty for initial query`
		} as RuleResponse),
			{ condition: (plan, query, linkId) => !linkId }),
		new Rule('NonEmptyPlan', async (plan: Plan, query: UniQuery, linkId?: string) =>
		({
			passed: Boolean(plan.path.length),
			message: `Plan required for non-empty link ID`
		} as RuleResponse),
			{ condition: (plan, query, linkId) => Boolean(linkId) }),
		new Rule('PlanMatch', async (plan: Plan, query: UniQuery, linkId?: string) => {
			const linkNonce = await this.cryptoHash.makeNonce(linkId!, query.sessionCode);
			return {
				passed: plan.path.length && plan.path[plan.path.length - 1].nonce === linkNonce,
				message: `Link ID doesn't match plan`
			} as RuleResponse
		},
			{ dependencies: ['NonEmptyPlan'] }),
	]);

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

	private plansFromCandidates(candidates: QueryCandidate[]): Plan[] {
		const negotiatePlan = this.getNegotiatePlan();
		return candidates.filter(({ request: r }) => r?.isResponse && r!.response!.plans?.length)
			.flatMap(({ request: r }) => r!.response!.plans!.map(p => negotiatePlan(p)).filter(Boolean) as Plan[]) as Plan[];
	}

	private getNegotiatePlan(): NegotiatePlanFunc {
		return this.options.negotiatePlan ?? ((p: Plan) => p);
	}
}

/** @returns new plan with the given participant prepended */
export function prependMatch(plan: Plan, match: Match): Plan {
	// Ensure that match.member is a participant
	if (!match.member.types.includes(MemberTypes.participant)) {
		throw new Error(`Member ${JSON.stringify(match.member.address)} must be a participant`);
	}
	// Ensure that match.dependsOn doesn't have any participants
	if (match.dependsOn?.some(dep => dep.types.includes(MemberTypes.participant))) {
		throw new Error(`Member ${JSON.stringify(match.member.address)} can't depend on participants`);
	}

	// Create a dependent member from the match, which references (rather than includes) its dependencies
	const asDependent = { ...match.member, ...(match.dependsOn ? { dependsOn: match.dependsOn?.map(d => d.address) } : {}) } as DependentMember;

	// Plan members "upgraded" with any physical addresses or secrets from this match's dependent members
	const upgraded = plan.members
		.map(m => [m, match.dependsOn?.find(d => addressesMatch(m.address, d.address))] as const)
		.map(([member, dep]) => ({
			...member,
			...(member.physical || dep?.physical ? { physical: member.physical ?? dep?.physical } : {}),
			...(member.secret || dep?.secret ? { secret: member.secret ?? dep?.secret } : {})
		} as IdentifiedMember));

		// Match's dependent members that aren't already in the plan
	const missing = match.dependsOn?.filter(dep => !plan.members.some(m => addressesMatch(m.address, dep.address))) ?? [];

	return { ...plan, members: [ asDependent, ...upgraded, ...missing ] };
}
