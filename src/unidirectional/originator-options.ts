import { QueryPeerFunc } from "../query-func";
import { StepOptions } from "../sequencing";
import { ExternalReferee } from "../plan";
import { CodeOptions } from "chipcode";

export class UniOriginatorOptions {
    maxDepth: number = 8;
    stepOptions = new StepOptions();
    codeOptions = new CodeOptions();

    constructor(
        public queryPeer: QueryPeerFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
