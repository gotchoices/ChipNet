import { SendUniFunc } from "./callbacks";
import { PhaseOptions } from "../phase";

export class UniParticipantOptions {
    maxAgeGap = 10000; // No longer than this between subsequent queries
    phaseOptions = new PhaseOptions();

    constructor (
        public key: Buffer,     // 256 bit encryption key for hidden information (e.g. crypto.randomBytes(32))
        public sendUni: SendUniFunc,
    ) {}
}