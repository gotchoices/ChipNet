import { LinearRoute } from "../route";

export class LinearResponse {
    constructor(
        public link: string,
        public routes: LinearRoute[] = [],
        public hiddenReentrance?: Uint8Array, // only present if querying could or should continue
    ) { }
}
