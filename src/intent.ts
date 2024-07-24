import { Plan } from "./plan";
import { Terms } from "./types";

export type IntentType = "L" | "C";
export type Intents = Record<IntentType, Terms>;
export type Intent = { code: IntentType, terms: Terms };

/** @returns true if the given intents are fully satisfied (not including verification of terms) */
export function intentsSatisfied(intents: Intents, plans: Plan[]) {
	return Object.entries(intents).every(([code, terms]) =>
		plans.some(plan =>
			plan.path.every(link =>
				Object.prototype.hasOwnProperty.call(link.intents, code) && JSON.stringify(link.intents[code as IntentType]) === JSON.stringify(terms)
			)
		)
	);
}

export function processIntents(intents: Intents, process: (intents: Intent[]) => Intent[]): Intents {
	return Object.fromEntries(
		process(Object.entries(intents)
			.map(([code, terms]) => ({ code: code as IntentType, terms }))
		).map(intent => [intent.code, intent.terms])
	) as Intents;
}
