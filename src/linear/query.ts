export interface LinearQuery {
    target: string;     // Target address or identity token (not an address)
    terms: any;         // Terms data to be passed to the target for matching
    queryId: string;    // Hash code used to anonymize node links
}