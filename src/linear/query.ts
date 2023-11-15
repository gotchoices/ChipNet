export interface LinearQuery {
    target: string;     // Target address or identity token (not an address)
    queryId: string;    // Hash code used to anonymize node addresses
    metadata: any;      // Arbitrary data to be passed to the target for matching
}