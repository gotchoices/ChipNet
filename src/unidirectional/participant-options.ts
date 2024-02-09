import { QueryPeerFunc } from "../query-func";
import { StepOptions } from "../sequencing";
import { ExternalReferee } from "../plan";

export class UniParticipantOptions {
	maxQueryAge = 10000; // No longer than this between subsequent queries
	stepOptions = new StepOptions();
	allowUnpersisted = true;
	ticketDurationMs = 30000;

	constructor(
		public queryPeer: QueryPeerFunc,
		public selfReferee: boolean,
		public externalReferees?: ExternalReferee[]
	) { }
}
