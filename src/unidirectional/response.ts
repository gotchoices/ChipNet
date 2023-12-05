import { Plan } from "../plan";

export class UniResponse {
    constructor(
        public link: string,
        public plans: Plan[] = [],
        public hiddenReentrance?: Uint8Array, // only present if querying could or should continue
    ) { }
}
