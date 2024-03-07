import { PublicTarget } from "../target";
import { Terms } from "../types";

export interface Intent {
	/** Standardized codes for comms and lifts */
	code: "L" | "C";
	version: number;
	/** Terms data defining the desired transactional relationship with the target (must be JSON serializable) */
	terms: Terms;
};

export interface UniQuery {
	/** Target address */
	target: PublicTarget;
	/** Hash code used to anonymize node links */
	sessionCode: string;
	/** Intended purpose(s) (comms, lifts, etc.) */
	intents: Intent[];
}
