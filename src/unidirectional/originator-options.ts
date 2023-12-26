import { SendUniFunc } from "./callbacks";
import { StepOptions } from "../sequencing";
import { TransactionIdOptions } from "../transaction-id-options";
import { ExternalReferee } from "../plan";

export class UniOriginatorOptions {
    maxDepth: number = 8;
    stepOptions = new StepOptions();
    transactionIdOptions = new TransactionIdOptions();

    constructor(
        public sendUni: SendUniFunc,
				public selfReferee: boolean,
				public externalReferees?: ExternalReferee[],
    ) {}
}
