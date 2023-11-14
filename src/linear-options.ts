import { LinearQuery } from "./linear-query";
import { INetwork } from "./network";
import { QueryOptions } from "./query-options";

export class LinearOptions {
    maxDepth: number = 8;
    minTime: number = 30;
    maxTime: number = 500;
    minRatio: number = 0.6;
    queryOptions = new QueryOptions();

    constructor(
        public target: string, // Target address or identity token (not an address)
        public peerAddresses: string[],
        public network: INetwork,
    ) {}
}