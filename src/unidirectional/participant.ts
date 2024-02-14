import { NegotiatePlanFunc, QueryRequest, QueryResponse } from "../query-func";
import { sequenceStep } from "../sequencing";
import { PrivateLink } from "../private-link";
import { UniParticipantState } from "./participant-state";
import { QueryStateContext } from "./query-state";
import { UniQuery } from "./query";
import { ExternalReferee, Participant, Plan, PublicLink, appendPath, prependParticipant } from "../plan";
import { QueryContext } from "./query-context";
import { QueryCandidate } from "./query-context";
import { ReentranceTicket } from "../reentrance";
import { UniParticipantOptions } from "..";
import { AsymmetricVault, CryptoHash } from "chipcryptbase";

export class UniParticipant {
	constructor(
		public readonly options: UniParticipantOptions,
		public readonly state: UniParticipantState,
		public readonly asymmetricVault: AsymmetricVault,
		public readonly cryptoHash: CryptoHash,
	) { }

	async query(request: QueryRequest, linkId?: string): Promise<QueryResponse> {
		if (request.first) {
			return await this.firstQuery(request.first.plan, request.first.query, linkId);
		} else if (request.ticket) {
			return await this.reenter(request.ticket, linkId);
		} else {
			throw new Error("Invalid request");
		}
	}

	/** First attempt (depth 1) search through this node */
	private async firstQuery(plan: Plan, query: UniQuery, linkId?: string): Promise<QueryResponse> {
		await this.validateQuery(plan, query, linkId);

		const queryState = await this.state.createQueryState(plan, query, linkId);	// Note: throws if there's already a query in progress

		const rawPlans = (await queryState.search()) || [];
		const plans = this.processAndFilterPlans(rawPlans, query);

		const newStateContext = plans?.length
			? { plans: plans } as QueryStateContext
			: {
				queryContext: {
					query: query,
					plan: plan,
					depth: 1,
					candidates: await this.processAndFilterCandidates((await queryState.getCandidates()), plan, query),
					time: Date.now(),
					duration: 0,	// Don't worry about duration for a depth 1 query (for measuring round-trip time from other nodes)
				} as QueryContext
			} as QueryStateContext;
		await queryState.saveContext(newStateContext);

		return plans?.length
			? { plans: await this.prependParticipant(plans) }
			: {
				ticket: {
					sessionCode: query.sessionCode,
					expires: Date.now() + this.options.ticketDurationMs
				}
			};
	}

	/** negotiate terms and plans for any matches, then filter any with rejected terms or plans */
	private processAndFilterPlans(matches: Plan[], query: UniQuery) {
		return (matches
			// Renegotiate terms for each step of path for each plan
			.map(plan => ({ ...plan, path: plan.path.map(p => ({ ...p, terms: this.options.negotiateTerms(p.terms, query.terms) })) }))
			// Filter out plans that have any links with rejected terms
			.filter(plan => plan.path.every(p => p.terms)) as Plan[])
			// Negotiate the plan (ie. vet and/or add external referees if needed)
			.map(p => this.getNegotiatePlan()(p))
			// Filter out any plans that were rejected by the negotiation
			.filter(p => p) as Plan[];
	}

	private async processAndFilterCandidates(candidates: PrivateLink[], plan: Plan, query: UniQuery) {
		// Determine any eligable terms and include nonces for all candidates
		const resolvedCandidates = (await Promise.all(candidates.map(async c => {
			const terms = this.options.negotiateTerms(c.terms, query.terms);
			const publicLink: PublicLink | undefined = terms ? { nonce: await this.cryptoHash.makeNonce(c.id, query.sessionCode), terms } : undefined;
			return { private: c, public: publicLink };
		})))
			// Only consider candidates that have acceptable terms
			.filter(c => c.public) as { private: PrivateLink, public: PublicLink }[];

		// Detect cycles in the candidates
		const cycles = new Set<string>(
			resolvedCandidates.filter(c => plan.path.some(p => p.nonce === c.public.nonce))
				.map(c => c.private.id)
		);

		// Report cycles
		if (cycles.size) {
			await this.state.reportCycles(query, plan.path.map(p => p.nonce), [...cycles]);
		}

		const filteredCandidates = resolvedCandidates.filter(c => !cycles.has(c.public.nonce));
		return filteredCandidates.map(c => ({ linkId: c.private.id, terms: c.public.terms } as QueryCandidate));
	}

	/** Query has already passed through this node.  Search one level further. */
	async reenter(ticket: ReentranceTicket, linkId?: string): Promise<QueryResponse> {
		// Restore and validate the context
		await this.validateTicket(ticket);
		const queryState = await this.state.getQueryState(ticket.sessionCode, linkId);
		const stateContext = await queryState.getContext();
		await this.validateQueryState(ticket, stateContext, linkId);
		const context = stateContext!.queryContext!;

		// Restore candidates that remained in-progress, from state
		const outstandingRequests = await queryState.startStep();

		// Build requests for all other candidates
		const candidatesToRequest = context.candidates.filter(c => !Object.prototype.hasOwnProperty.call(outstandingRequests, c.linkId));
		const candidatesToRequestsAndNonces = await Promise.all(
			candidatesToRequest.map(async c => [c, await this.cryptoHash.makeNonce(c.linkId, context.query.sessionCode)] as const)
		);
		const newRequests = Object.fromEntries(
			candidatesToRequestsAndNonces.map(([c, nonce]) => [c.linkId,
				this.options.queryPeer(c.ticket
						? { ticket: c.ticket }
						: { first: { plan: appendPath(context.plan, { nonce , terms: c.terms! }), query: context.query }  },
					c.linkId
				)])
		);

		// Process the step (query sub-nodes)
		const baseTime = Math.max((context.depth - 1) * this.options.stepOptions.minTimeMs, context.time ?? 0);
		const stepResponse = await sequenceStep(baseTime, { ...outstandingRequests, ...newRequests }, this.options.stepOptions);
		await queryState.completeStep(stepResponse);

		const plans =
			Object.values(stepResponse.results).flatMap(r => r.plans)
				.map(p => p ? this.getNegotiatePlan()(p) : undefined)
				.filter(p => p) as Plan[];

		const newState = plans?.length
			? { plans } as QueryStateContext
			: {
				queryContext: {
					query: context.query,
					plan: context.plan,
					depth: context.depth + 1,
					candidates: Object.entries(stepResponse.results).filter(r => r[1].ticket)
						.map(([linkId, r]) => ({ linkId, ticket: r.ticket } as QueryCandidate)),
					time: Date.now(),
					duration: Date.now() - context.time
				} as QueryContext
			} as QueryStateContext;
		await queryState.saveContext(newState);

		return plans?.length
			? { plans: await this.prependParticipant(plans) } as QueryResponse
			: {
				ticket:
					newState.queryContext?.candidates.length ? {
						sessionCode: context.query.sessionCode,
						expires: Date.now() + this.options.ticketDurationMs
					}
						: undefined
			};
	}

	private async prependParticipant(plans: Plan[]) {
		const participant: Participant = {
			key: await this.asymmetricVault.getPublicKeyAsString(),
			isReferee: this.options.selfReferee,
			secret: this.options.selfSecret,
		};
		return plans.map(p => prependParticipant(p, participant));
	}

	private async validateTicket(ticket: ReentranceTicket) {
		if (ticket.expires < Date.now()) {
			throw new Error("Ticket expired");
		}
	}

	private async validateQuery(plan: Plan, query: UniQuery, linkId?: string) {
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
		// TODO: validate that the incoming (partner) link has terms acceptable to us
	}

	private async validateQueryState(ticket: ReentranceTicket, stateContext?: QueryStateContext, linkId?: string) {
		// Verify that we haven't already given a concluding response for the query
		if (stateContext?.plans) {
			throw new Error("Query already completed");
		}

		const context = stateContext?.queryContext;
		if (!context) {
			throw new Error(`Persisted context for reentrance (${ticket.sessionCode}) not found.`);
		}
		// validate that the depth isn't too deep
		if (context.depth >= this.options.maxDepth) {	// Assume we're going one deeper than prior context
			throw new Error(`Query depth (${context.depth}) exceeds maximum (${this.options.maxDepth})`);
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

		// Ensure that the time is not too old
		if (context.time < Date.now() - this.options.maxQueryAgeMs) {
			throw Error("Query stale");
		}
	}

	private getNegotiatePlan(): NegotiatePlanFunc {
		return this.options.negotiatePlan ?? this.getDefaultNegotiatePlan();
	}

	private getDefaultNegotiatePlan(): NegotiatePlanFunc {
		return (plan: Plan) => {
			// TODO: Equalize the balance of the terms (will have to be a callback)
			return this.options.externalReferees?.length
				? { ...plan, externalReferees: concatExternalReferees(plan.externalReferees ?? [], this.options.externalReferees) }
				: plan;
		};
	}
}

/** @returns Deduplicated union of referees, or undefined if both sets are empty */
function concatExternalReferees(referees1: ExternalReferee[], referees2: ExternalReferee[]) {
	const result = referees1.concat(referees2.filter(r2 => !referees1.find(r1 => r1.key === r2.key)));
	return result.length ? result : undefined;
}
