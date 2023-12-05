import { SendUniFunc } from "./callbacks";
import { SequenceOptions } from "../sequencing";
import { TransactionIdOptions } from "../transaction-id-options";
import { ExternalReferee } from "../plan";

export class UniOriginatorOptions {
    maxDepth: number = 8;
    phaseOptions = new SequenceOptions();
    transactionIdOptions = new TransactionIdOptions();

    constructor(
        public sendUni: SendUniFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
