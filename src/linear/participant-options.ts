import { LinearQuery } from "./query";

export class LinearParticipantOptions {
    maxAgeGap = 10000; // No longer than this between subsequent queries
    
    constructor (
        public key: Buffer,     // 256 bit encryption key for hidden information (e.g. crypto.randomBytes(32))
    ) {}
}