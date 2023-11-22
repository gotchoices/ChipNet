import { UniRoute } from "../route";

export class UniResponse {
    constructor(
        public link: string,
        public routes: UniRoute[] = [],
        public hiddenReentrance?: Uint8Array, // only present if querying could or should continue
    ) { }
}
