import { Terms } from "./types";

export interface UniLink {
    id: string;
    terms: Terms;
}

export interface UniSegment {
    nonce: string;
    terms: Terms;
}

export type UniRoute = UniSegment[];