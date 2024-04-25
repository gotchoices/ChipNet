import { Plan } from "./plan";
import { Terms } from "./types";

export interface Intent {
	/** Standardized codes for comms, lifts, or referee */
	code: "L" | "C";
	version: number;
	/** Terms data defining the desired transactional relationship with the target (must be JSON serializable) */
	terms: Terms;
}

/** @returns true if the given intents are fully satisfied (not including verification of terms) */
export function intentsSatisfied(intents: Intent[], plans: Plan[]) {
	return intents.every(intent => plans.some(plan => plan.path.every(link => link.intents.some(li => li.code === intent.code))));
}
