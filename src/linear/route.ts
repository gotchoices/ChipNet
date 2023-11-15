import { Path } from "../path";

export class LinearRoute {
    constructor(
        public rootAddress: string,
        public depth: number,
        public path: Path,
    ) {}
}