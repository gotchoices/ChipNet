import { LinearResponse } from "./linear-response";
import { LinearNetworkResponse } from "./network";

export class LinearRequest {
    constructor(
        public address: string,
        public depth: number,
        public response: Promise<LinearNetworkResponse>
    ) { }
}
