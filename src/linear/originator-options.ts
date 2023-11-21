import { INetwork } from "../network";
import { PhaseOptions } from "../phase";
import { QueryOptions } from "../query-options";

export class LinearOriginatorOptions {
    maxDepth: number = 8;
    phaseOptions = new PhaseOptions();
    queryOptions = new QueryOptions();
    
    constructor(
        public peerLinks: string[],
        public network: INetwork,
    ) {}
}