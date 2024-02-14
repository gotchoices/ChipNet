import { QueryPeerFunc } from "../query-func";
import { ExternalReferee } from "../plan";

export class UniOriginatorOptions {
    maxDepth: number = 7;	// if this changes, also change UniParticipantOptions.maxDepth

    constructor(
        public queryPeer: QueryPeerFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
