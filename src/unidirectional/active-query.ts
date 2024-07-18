import { QueryResponse } from "../query-struct";
import { Pending } from "../pending";
import { Intent } from "../intent";

/** A candidate that is actively being queried on. */
export interface QueryCandidate {
	linkId: string;
	nonce: string;
	/** The intents and related terms that are negotiated for the initial query of this candidate.  This will only be set for a depth = 1 candidate. */
	intents?: Intent[];
	/** Query depth of the candidate.  May be different than query context if candidate doesn't reply in time for start of next sequence. */
	depth: number;
	/** The request, if there is one pending for this candidate. */
	request?: Pending<QueryResponse>;
}

/** The state of an active query. */
export interface ActiveQuery {
	depth: number;
	/** The candidates that are still under consideration */
	candidates: QueryCandidate[];
}
