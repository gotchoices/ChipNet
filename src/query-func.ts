import { Plan } from "./plan";
import { Terms } from "./types";
import { UniQuery } from "./unidirectional/query";
import { ReentranceTicket } from "./reentrance";

/**
 * Response from a participant.
 * If no reentrance ticket given, no further queries can be performed.
 * If neither plans or reentrance is given, the search via this node has ended.
 */
export interface QueryResponse {
	/** Successful plans (if any) */
	plans?: Plan[];
	/** If present, further searches are possible; must include this */
	ticket?: ReentranceTicket;
}

/**
 * Node discovery request
 * will container either first, which contains the query and plan so far, or a reentrance ticket to continue a previous query (not both)
 */
export interface QueryRequest {
	first?: {
		/** Original target and terms from originator */
		query: UniQuery;
		/** The transaction plan so far, including path of edge nonces (SessionCode anonymized links) encountered so far, and other terms */
		plan: Plan;
	},
	ticket?: ReentranceTicket,
}

/**
 * Sends a discovery request to the peer identified by the link
 * @param request The request to send
 * @param link The link identifier of the peer to send the request to
 */
export type QueryPeerFunc = (request: QueryRequest, linkId: string) => Promise<QueryResponse>;

/**
 * A function that compares the terms on a link with the query terms and returns the terms as constained by the match or undefined if there is no match
 * @param linkTerms The terms on the link
 * @param queryTerms The terms in the query
 * @returns The terms that match, or undefined if there is no match
 */
export type MatchTermsFunc = (linkTerms: Terms, queryTerms: Terms) => Terms | undefined;

/**
 * A function that negotiates the referees and other aspect of the plan
 * @param plan The incoming plan to negotiate
 * @returns The revised plan or undefined if the plan is rejected
 */
export type NegotiatePlanFunc = (plan: Plan) => Plan | undefined;
