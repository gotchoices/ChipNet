import { UniQuery } from "..";
import { Plan } from "../plan";
import { ActiveQuery } from "./active-query";

/** Represents the current context of an active query.  Any produced plans and/or the reentrance information. */
export interface QueryContext {
	query: UniQuery;
	plan: Plan;
	linkId?: string;
	plans?: Plan[];
	activeQuery?: ActiveQuery
}
