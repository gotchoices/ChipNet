import { Plan } from "./plan";
import { Terms } from "./types";

export interface Intent {
	/** Standardized codes for comms and lifts */
	code: "L" | "C";
	version: number;
	/** Terms data defining the desired transactional relationship with the target (must be JSON serializable) */
	terms: Terms;
}

export function intentsSatisfied(intents: Intent[], plans: Plan[]) {
	// TODO: check if all intents are satisfied - reuse with originator?
	return Boolean(plans.length);
}

export function intentsQualify(linkIntents: Intent[], queryIntents: Intent[]) {

}
