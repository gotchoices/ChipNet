import { SendUniFunc } from "./callbacks";
import { PhaseOptions } from "../phase";
import { TransactionIdOptions } from "../transaction-id-options";

export class UniOriginatorOptions {
    maxDepth: number = 8;
    phaseOptions = new PhaseOptions();
    transactionIdOptions = new TransactionIdOptions();
    
    constructor(
        public sendUni: SendUniFunc,
    ) {}
}