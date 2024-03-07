import { NegotiateIntentFunc, QueryPeerFunc } from "../query-func";
import { StepOptions } from "../sequencing";
import { Member, Plan } from "../plan";

export class UniParticipantOptions {
	maxQueryAgeMs = 10000; // No longer than this between subsequent queries
	stepOptions = new StepOptions();
	allowUnpersisted = true;
	maxDepth = 7;	// Should generally be the same the originator's maxDepth
	negotiatePlan?: (p: Plan) => Plan;

	constructor(
		public queryPeer: QueryPeerFunc,
		public selfReferee: boolean,
		public negotiateIntent: NegotiateIntentFunc,
		public selfSecret?: string,
		public otherMembers?: Record<string, Member>
	) { }

}
