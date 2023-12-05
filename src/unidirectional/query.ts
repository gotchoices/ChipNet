import { PublicTarget } from "../target";
import { Terms } from "../types";

export interface UniQuery {
    target: PublicTarget;     // Target address
    terms: Terms;         // Terms data to be passed to the target for matching
    transactionId: string;    // Hash code used to anonymize node links
}
