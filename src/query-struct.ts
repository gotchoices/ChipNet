import { Plan } from "./plan";
import { UniQuery } from "./unidirectional/query";
import { Intent } from "./intent";
import { Reentrance } from "./reentrance";
import { Centroid } from "sparstogram";

export interface QueryStats {
	/** Time delay between receipt of query, and response given.  Note that this may be shorter than budget if all responses are in. */
	gross: number;
	/** Time delay between query receipt and first (this cycle) response */
	earliest: number;
	/** Time delay between query receipt and last (this cycle) response */
	latest: number;
	/** Sparstogram of net response times for all sub-queries */
	timings: Centroid[];
	/** The count of all still-outstanding sub-queries */
	outstanding: number;
}

/**
 * Response from a participant.
 * If no reentrance ticket given, no further queries can be performed.
 * If neither plans or reentrance is given, the search via this node has ended.
 */
export interface QueryResponse {
	/** Successful plans (if any) */
	plans?: Plan[];
	/** If set, further searches are possible */
	reentrance?: Reentrance;
	/** Timing statistics */
	stats: QueryStats;
}

/**
 * Node discovery request
 * will container either first, which contains the query and plan so far, or a reentrance session code to continue a previous query (not both)
 */
export interface QueryRequest {
	first?: {
		/** Original target and terms from originator */
		query: UniQuery;
		/** The transaction plan so far, including path of edge nonces (SessionCode anonymized links) encountered so far, and other terms */
		plan: Plan;
	},
	reentrance?: Reentrance,
	/** Time budget (ms) for this query, already subtracting out estimated time to this node */
	budget: number;
}

/**
 * Sends a discovery request to the peer identified by the link
 * @param request The request to send
 * @param link The link identifier of the peer to send the request to
 */
export type QueryPeerFunc = (request: QueryRequest, linkId: string) => Promise<QueryResponse>;

/**
 * A function that compares the intents & terms on a link with the query terms and returns the intent as constrained by the match or undefined if there is no match
 * @param linkIntent The intent on the link
 * @param queryTerms The intents in the query
 * @returns The intent that matches, or undefined if there is no match
 */
export type NegotiateIntentFunc = (linkIntent: Intent, queryIntents: Intent[]) => Intent | undefined;

/**
 * A function that negotiates the referees and other aspect of the plan
 * @param plan The incoming plan to negotiate
 * @returns The revised plan or undefined if the plan is rejected
 */
export type NegotiatePlanFunc = (plan: Plan) => Plan | undefined;
