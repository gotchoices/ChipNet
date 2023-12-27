import { SendUniFunc } from "./callbacks";
import { StepOptions } from "../sequencing";
import { SessionIdOptions } from "../session-id-options";
import { ExternalReferee } from "../plan";

export class UniOriginatorOptions {
    maxDepth: number = 8;
    stepOptions = new StepOptions();
    sessionIdOptions = new SessionIdOptions();

    constructor(
        public sendUni: SendUniFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
