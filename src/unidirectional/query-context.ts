import { Match, UniQuery } from ".";
import { Plan } from "..";
import { ActiveQuery } from "./active-query";

/** Represents the current context of an active query.  Any produced plans and/or the reentrance information. */
export interface QueryContext {
	query: UniQuery;
	plan: Plan;
	self: Match;
	linkId?: string;
	plans?: Plan[];
	activeQuery?: ActiveQuery;
}
