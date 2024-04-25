import { NegotiateIntentFunc, QueryPeerFunc } from "../query-struct";
import { Plan } from "../plan";
import { Member } from "../member";

export class UniParticipantOptions {
	maxQueryAgeMs = 10000; // No longer than this between subsequent queries
	allowUnpersisted = true;
	maxDepth = 7;	// Should generally be the same the originator's maxDepth
	negotiatePlan?: (p: Plan) => Plan;
	timingStatBuckets = 20;

	constructor(
		public queryPeer: QueryPeerFunc,
		public selfReferee: boolean,
		public negotiateIntent: NegotiateIntentFunc,
		public selfSecret?: string,
		public otherMembers?: Record<string, Member>
	) { }

}
