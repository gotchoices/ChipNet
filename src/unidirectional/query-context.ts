import { Terms } from "..";
import { Plan } from "../plan";
import { UniQuery } from "./query";

/** A candidate that is actively being queried on. */
export interface QueryCandidate {
	linkId: string;
	/** The terms that are negotiated for the initial query of this candidate.  This OR ticket will be set. */
	terms?: Terms;
	/** Indicates reentry, if we've already received a response from this candidate.  This OR terms will be set. */
	isReentry?: boolean,
}

/** The query context as of the last pass. */
export interface QueryContext {
	query: UniQuery;
	plan: Plan;
	depth: number;
	/** The candidates that are still under consideration (excluding requests that remain outstanding, which are tracked separately) */
	candidates: QueryCandidate[];
	time: number;
	duration?: number;
}
