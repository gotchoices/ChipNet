import { TraceFunc } from "../trace";
import { UniQuery } from "./query";
import { QueryContext } from "./query-context";

/** Represents the state of a participant in unidirectional discovery. */
export interface UniParticipantState {
	/** Ensures that the given query is not already active
	 * @throws If there is already an active query for the given session.
	*/
	validateNewQuery(sessionCode: string, path: string[]): Promise<void>;

	/** Gets the query context for the given query session.
	 * @throws If there is no query in process for the query session.
	*/
	getContext(sessionCode: string, path: string[]): Promise<QueryContext>;

	/** Persists the given query context for later recall
	 * Once the session is expired, the context may be deleted. */
	saveContext(context: QueryContext, path: string[]): Promise<void>;


	/** @returns the estimated round-trip time overhead (in ms) for the given link */
	getPeerOverhead(path: string[]): Promise<number>

	/** Reports the actual experienced round-trip time overhead (in ms) for the given link */
	reportOverhead(path: string[], overhead: number): Promise<void>;

	reportCycles(query: UniQuery, path: string[], collisions: string[]): Promise<void>;
	reportTimingViolation(query: UniQuery, path: string[]): Promise<void>;

	/** @returns a mapping of nonce to link id for the given query session */
	getNonceToLinkMap(sessionCode: string): Promise<Record<string, string>>;

	trace?: TraceFunc
}

