import { Terms } from "../types";

export interface UniQuery {
    target: string;     // Target address or identity token (not an address)
    terms: Terms;         // Terms data to be passed to the target for matching
    transactionId: string;    // Hash code used to anonymize node links
}