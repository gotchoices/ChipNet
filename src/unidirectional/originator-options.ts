import { SendUniFunc } from "./callbacks";
import { StepOptions } from "../sequencing";
import { ExternalReferee } from "../plan";
import { CodeOptions } from "chipcode";

export class UniOriginatorOptions {
    maxDepth: number = 8;
    stepOptions = new StepOptions();
    codeOptions = new CodeOptions();

    constructor(
        public sendUni: SendUniFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
