import { INetwork } from "../network";
import { PhaseOptions } from "../phase";
import { TransactionIdOptions } from "../transaction-id-options";

export class LinearOriginatorOptions {
    maxDepth: number = 8;
    phaseOptions = new PhaseOptions();
    transactionIdOptions = new TransactionIdOptions();
    
    constructor(
        public network: INetwork,
    ) {}
}