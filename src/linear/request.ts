import { LinearResponse } from "./response";
import { LinearQueryResponse } from "../network";

export class LinearRequest {
    constructor(
        public address: string,
        public depth: number,
        public response: Promise<LinearQueryResponse>
    ) { }
}
