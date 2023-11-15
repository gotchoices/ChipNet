import { LinearQueryResponse } from "../network";
import { LinearQuery } from "./query";

export class LinearParticipant {
    constructor() {}
    
    async query(path: string[], query: LinearQuery, hiddenData?: Uint8Array): Promise<LinearQueryResponse> {
        return { paths: [] } as LinearQueryResponse;
    }
}