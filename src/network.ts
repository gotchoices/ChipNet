import { LinearQuery } from "./linear/query";
import { Path } from "./path";

export interface SendLinearResponse {
    hiddenReentrance?: Uint8Array;  // If present, further searches are possible
    paths: Path[];  // Found paths
}

export interface INetwork {
    /**
     * Sends a linear lift request to the peer identified by the link
     * @param link The link identifier of the peer to send the request to
     * @param path The nonces (QueryId anonymized links) of all parent edges encountered so far (to avoid cycles)
     * @param query Original query from originator
     * @param hiddenReentrance The encrypted reentrance data returned by the peer from prior request (if not first request)
     */
    sendLinear(link: string, path: string[], query: LinearQuery, hiddenReentrance?: Uint8Array): Promise<SendLinearResponse>;
}