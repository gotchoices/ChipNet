import { MatchTermsFunc, QueryPeerFunc } from "../query-func";
import { StepOptions } from "../sequencing";
import { ExternalReferee, Plan } from "../plan";

export class UniParticipantOptions {
	maxQueryAgeMs = 10000; // No longer than this between subsequent queries
	stepOptions = new StepOptions();
	allowUnpersisted = true;
	ticketDurationMs = 30000;
	maxDepth = 6;	// Should generally be one less than the originator's maxDepth
	negotiatePlan?: (p: Plan) => Plan;

	constructor(
		public queryPeer: QueryPeerFunc,
		public selfReferee: boolean,
		public negotiateTerms: MatchTermsFunc,
		public selfSecret?: string,
		public externalReferees?: ExternalReferee[]
	) { }

}
