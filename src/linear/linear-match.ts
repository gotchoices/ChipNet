import { LinearSegment } from "./linear-segment";

export interface LinearSearchResult {
    match: LinearMatchSegment | LinearMatch;
    candidates: LinearSegment[];
}

export interface LinearMatchSegment extends LinearSegment {
    hiddenNext?: Uint8Array;   // If this is undefined, the node on the other end of the link is the matched target; if it is present, the other end of the target might be a match or another match segment; we don't know because it's encrypted
}

/** This is created if a query propagates to the node itself.  This allows an address to be given that is secret or temporary. */
export interface LinearMatch {
    identity: string;   // The address or identity token that was matched
    metadata: any;
}
