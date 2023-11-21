import { Path } from "../path";

export class LinearResponse {
    constructor(
        public link: string,
        public depth: number = 0,
        public paths: Path[] = [],
        public hiddenReentrance?: Uint8Array, // only present if querying could or should continue
    ) { }
}
