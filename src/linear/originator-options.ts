import { INetwork } from "../network";
import { PhaseOptions } from "../phase";
import { QueryOptions } from "../query-options";

export class LinearOriginatorOptions {
    maxDepth: number = 8;
    phaseOptions = new PhaseOptions();
    queryOptions = new QueryOptions();
    
    constructor(
        public target: string,  // Target address or identity token (not an address)
        public metadata: any,   // Arbitrary query data to be passed to the target for matching
        public peerAddresses: string[],
        public network: INetwork,
    ) {}
}