import { INetwork } from "../network";
import { QueryOptions } from "../query-options";

export class LinearOriginatorOptions {
    maxDepth: number = 8;
    minTime: number = 30;
    maxTime: number = 500;
    minRatio: number = 0.6;
    queryOptions = new QueryOptions();
    
    constructor(
        public target: string,  // Target address or identity token (not an address)
        public metadata: any,   // Arbitrary query data to be passed to the target for matching
        public peerAddresses: string[],
        public network: INetwork,
    ) {}
}