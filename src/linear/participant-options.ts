import { INetwork } from "../network";
import { PhaseOptions } from "../phase";
import { LinearQuery } from "./query";

export class LinearParticipantOptions {
    maxAgeGap = 10000; // No longer than this between subsequent queries
    phaseOptions = new PhaseOptions();

    constructor (
        public key: Buffer,     // 256 bit encryption key for hidden information (e.g. crypto.randomBytes(32))
        public network: INetwork,
    ) {}
}