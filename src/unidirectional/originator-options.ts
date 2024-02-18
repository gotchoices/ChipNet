import { QueryPeerFunc } from "../query-func";
import { Member } from "../plan";

export class UniOriginatorOptions {
    maxDepth: number = 7;	// if this changes, also change UniParticipantOptions.maxDepth

    constructor(
        public queryPeer: QueryPeerFunc,
				public selfReferee: boolean,
				public externalReferees?: Member[],
    ) {}
}
