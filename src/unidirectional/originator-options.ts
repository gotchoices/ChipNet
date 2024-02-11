import { QueryPeerFunc } from "../query-func";
import { ExternalReferee } from "../plan";

export class UniOriginatorOptions {
    maxDepth: number = 7;

    constructor(
        public queryPeer: QueryPeerFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
