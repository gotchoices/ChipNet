import { Plan } from "../plan";
import { PrivateLink, QueryResponse } from "..";
import { QueryContext } from "./query-context";
import { Pending } from "../pending";

export interface QueryStateContext {
	plans?: Plan[];
	queryContext?: QueryContext
}

export interface UniQueryState {
	getContext(): Promise<QueryStateContext | undefined>;
	/** Indicates that a sequence step is starting.
	 * @returns Any existing already outstanding requests. */
	recallRequests(): Promise<Record<string, Pending<QueryResponse>>>;
	storeRequests(requests: Record<string, Pending<QueryResponse>>): Promise<void>;
	search(): Promise<Plan[] | undefined>;
	getCandidates(): Promise<PrivateLink[]>;
	saveContext(context: QueryStateContext): Promise<void>;
}
