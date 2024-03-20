import { Plan } from "../plan";
import { UniQuery } from "./query";
import { QueryContext, UniQueryState } from "./query-context";

/** Represents the state of a participant in unidirectional discovery. */
export interface UniParticipantState {
	/** Creates a query context for the given under-construction plan and query, including searching and enumerating candidates */
	createContext(plan: Plan, query: UniQuery): Promise<QueryContext>

	/** Ensures that the given query is not already active
	 * @throws If there is already an active query for the given session.
	*/
	validateNewQuery(sessionCode: string, linkId?: string): Promise<void>;

	/** Gets the query context for the given query session.
	 * @throws If there is no query in process for the query session.
	*/
	getContext(sessionCode: string, linkId?: string): Promise<QueryContext>;

	/** Persists the given query context for later recall
	 * Once the session is expired, the context may be deleted. */
	saveContext(context: QueryContext): Promise<void>;


	/** @returns the estimated round-trip time overhead (in ms) for the given link */
	getPeerOverhead(linkId: string): Promise<number>

	/** Reports the actual experienced round-trip time overhead (in ms) for the given link */
	reportOverhead(linkId: string, overhead: number): Promise<void>;

	reportCycles(query: UniQuery, path: string[], collisions: string[]): Promise<void>;
	reportTimingViolation(query: UniQuery, linkId: string): Promise<void>;
}

