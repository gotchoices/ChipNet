import { Participant, Plan } from "../plan";
import { UniParticipantOptions } from "./participant-options";
import { UniQuery } from "./query";
import { UniQueryState } from "./query-state";

/** Represents the state of a participant in unidirectional discovery. */
export interface UniParticipantState {
	readonly options: UniParticipantOptions;

	/**
	 * Starts new query state for the specified plan and query.
	 * @param plan - The plan as it has been constructed so far.
	 * @param query - The query being sent.
	 * @param linkId - Optional. The ID of the link through which this query came.  This should match the ending nonce in the plan's path.
	 * @returns A promise that resolves to the created query state.
	 * @throws If there is already a query in process for the query session.
	*/
	createQueryState(plan: Plan, query: UniQuery, linkId?: string): Promise<UniQueryState>;

	/**
	 * Gets the query state for the specified query session.
	 * @param sessionCode - The query session code.
	 * @returns A promise that resolves to the query state.
	 * @throws If there is no query in process for the query session.
	*/
	getQueryState(sessionCode: string): Promise<UniQueryState>;

	reportCycles(query: UniQuery, path: string[], collisions: string[]): Promise<void>;

	getParticipant(): Promise<Participant>;
}

