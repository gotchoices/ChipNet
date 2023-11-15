import { LinearResponse } from "./response";
import { SendLinearResponse } from "../network";

export class LinearRequest {
    constructor(
        public address: string,
        public depth: number,
        public response: Promise<SendLinearResponse>
    ) { }
}
