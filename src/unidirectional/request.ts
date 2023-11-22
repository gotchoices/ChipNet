import { SendUniResponse } from "../network";

export class UniRequest {
    constructor(
        public link: string,
        public response: Promise<SendUniResponse>
    ) { }
}
