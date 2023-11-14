import { LinearQuery } from "./linear-query";
import { Path } from "./path";

export interface LinearNetworkResponse {
    hiddenData?: Uint8Array;
    paths: Path[];
}

export interface INetwork {
    /**
     * Sends a linear lift request to the peer identified by the address at the end of the path
     * @param address The address of the peer to send the request to
     * @param path The nonces (QueryId anonymized addresses) of all parent edges encountered so far (to avoid cycles)
     * @param query Original query from originator
     * @param hiddenData The hidden data returned by the peer from prior request (if not first request) - includes encoded depth
     */
    sendLinear(address: string, path: string[], query: LinearQuery, hiddenData?: Uint8Array): Promise<LinearNetworkResponse>;
}