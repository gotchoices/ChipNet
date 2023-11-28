import { SendUniResponse } from "./callbacks";

export class UniRequest {
    constructor(
        public link: string,
        public response: Promise<SendUniResponse>
    ) { }
}
