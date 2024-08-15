import { NegotiateIntentFunc } from "../query-struct";
import { Plan } from "../plan";

export class UniParticipantOptions {
	maxQueryAgeMs = 10000; // No longer than this between subsequent queries
	allowUnpersisted = true;
	maxDepth = 7;	// Should generally be the same the originator's maxDepth
	negotiatePlan?: (p: Plan) => Plan;
	timingStatBuckets = 20;
	minSessionMs = 30000;	// Minimum time that must be left on the session to accept it - need time to process on it

	constructor(
		public negotiateIntent: NegotiateIntentFunc,
	) { }

}
