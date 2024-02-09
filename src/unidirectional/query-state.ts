import { StepResponse } from "../sequencing";
import { Plan } from "../plan";
import { Terms } from "../types";
import { PrivateLink, QueryResponse } from "..";
import { QueryContext } from "./query-context";

export interface UniSearchResult {
	plans?: Plan[];
	candidates?: PrivateLink[];
}

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
	search(): Promise<UniSearchResult>;
	negotiatePlan(p: Plan): Promise<Plan>;
	negotiateTerms(linkTerms: Terms, queryTerms: Terms): Promise<Terms | undefined>;
	saveContext(context: QueryStateContext): Promise<void>;
}
