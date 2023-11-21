import { Path } from "../path";

export class LinearRoute {
    constructor(
        public rootLink: string,
        public depth: number,
        public path: Path,
    ) {}
}