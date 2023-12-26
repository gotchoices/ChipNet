import { SendUniFunc } from "./callbacks";
import { StepOptions } from "../sequencing";
import { ExternalReferee } from "../plan";

export class UniParticipantOptions {
    maxAgeGap = 10000; // No longer than this between subsequent queries
    stepOptions = new StepOptions();

    constructor (
        public key: Buffer,     // 256 bit encryption key for hidden information (e.g. crypto.randomBytes(32))
        public sendUni: SendUniFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[]
    ) {}
}
