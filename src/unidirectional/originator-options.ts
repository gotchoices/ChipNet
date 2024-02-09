import { QueryPeerFunc } from "../query-func";
import { ExternalReferee } from "../plan";
import { CodeOptions } from "chipcode";

export class UniOriginatorOptions {
    maxDepth: number = 7;
    codeOptions = new CodeOptions();

    constructor(
        public queryPeer: QueryPeerFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
