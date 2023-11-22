import { SendLinearResponse } from "../network";

export class LinearRequest {
    constructor(
        public link: string,
        public response: Promise<SendLinearResponse>
    ) { }
}
