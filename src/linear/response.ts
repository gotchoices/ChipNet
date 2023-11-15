import { Path } from "../path";

export class LinearResponse {
    constructor(
        public address: string,
        public depth: number = 0,
        public paths: Path[] = [],
        public hiddenData?: Uint8Array, // only present if querying could or should continue
    ) { }
}
