import { Plan } from "./plan";
import { Terms } from "./types";

export interface Intent {
	/** Standardized codes for comms, lifts, or referee */
	code: "L" | "C";
	version: number;
	/** Terms data defining the desired transactional relationship with the target (must be JSON serializable) */
	terms: Terms;
}

export function intentsSatisfied(intents: Intent[], plans: Plan[]) {
	// TODO: check if the terms are satisfied
	return intents.every(intent => plans.some(plan => plan.path.every(link => link.intents.some(li => li.code === intent.code))));
}
