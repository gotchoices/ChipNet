import { Terms } from "..";
import { Plan } from "../plan";
import { ReentranceTicket } from "../reentrance";
import { UniQuery } from "./query";

export const queryContextNameMap = {
	linkId: 'l',
	terms: 't',
	hiddenData: 'h',
	request: 'r',
	query: 'q',
	plan: 'p',
	sessionCode: 'sc',
	key: 'k',
	identity: 'i',
	isPrivate: 'p',
	secret: 's',
	depth: 'd',
	candidates: 'c',
	time: 't',
	duration: 'd',
	url: 'u',
	nonce: 'n',
	isReferee: 'r',
	path: 'pa',
	participants: 'p',
	externalReferees: 'e',
} as Record<string, string>;

export const reverseQueryContextNameMap = Object.fromEntries(Object.entries(queryContextNameMap).map(([k, v]) => [v, k]));

/** A candidate that is actively being queried on.
 * WARNING: If anything changes, be sure to update queryContextNameMap
 */
export interface QueryCandidate {
	linkId: string;
	/** The terms that are negotiated for the initial query of this candidate.  This OR ticket will be present. */
	terms?: Terms;
	/** Reentry ticket, if we've already received a response from this candidate.  This OR terms will be present. */
	ticket?: ReentranceTicket,
}

/** The query context as of the last pass.
 * WARNING: If anything changes, be sure to update queryContextNameMap
*/
export interface QueryContext {
	query: UniQuery;
	plan: Plan;
	depth: number;
	/** The candidates that are still under consideration (excluding requests that remain outstanding, which are tracked separately) */
	candidates: QueryCandidate[];
	time: number;
	duration?: number;
}
