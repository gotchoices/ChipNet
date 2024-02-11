import { StepResponse } from "../sequencing";
import { Plan } from "../plan";
import { PrivateLink, QueryResponse } from "..";
import { QueryContext } from "./query-context";

export interface QueryStateContext {
	plans: Plan[] | undefined;
	queryContext: QueryContext
}

export interface UniQueryState {
	getContext(): Promise<QueryStateContext | undefined>;
	/** Indicates that a sequence step is starting.
	 * @returns Any existing already outstanding requests. */
	startStep(): Promise<Record<string, Promise<QueryResponse>>>;
	completeStep(response: StepResponse<QueryResponse>): Promise<void>;
	search(): Promise<Plan[] | undefined>;
	getCandidates(): Promise<PrivateLink[]>;
	saveContext(context: QueryStateContext): Promise<void>;
}
