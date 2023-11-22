import { UniRoute, UniSegment } from "./route";
import { UniQuery } from "./unidirectional/query";

export interface SendUniResponse {
    hiddenReentrance?: Uint8Array;  // If present, further searches are possible
    routes: UniRoute[];  // Found paths
}

export interface INetwork {
    /**
     * Sends a Uni lift request to the peer identified by the link
     * @param link The link identifier of the peer to send the request to
     * @param path The nonces (TransactionId anonymized links) of all parent edges encountered so far (to avoid cycles)
     * @param query Original query from originator
     * @param hiddenReentrance The encrypted reentrance data returned by the peer from prior request (if not first request)
     */
    sendUni(link: string, path: UniSegment[], query: UniQuery, hiddenReentrance?: Uint8Array): Promise<SendUniResponse>;
}