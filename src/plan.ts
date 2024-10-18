import { Intents } from "./intent";
import { DependentMember } from "./member";

export interface PlanLink {
	nonce: string;
	intents: Intents;
}

/*
	Note: Plan is distinct from Topology because it is constructed up the tree
	first by path, then back down by participant.
*/

export interface Plan {
	/** Anonymized links (one fewer than participants) - these are filled out as the query traverses forward */
	path: PlanLink[];
	/** All members (participants first, then referees or relays)
	 * These are filled out once the search succeeds and the result propagates back towards the originator */
	members: DependentMember[];
	/** Payload for the plan - e.g. message from terminus to originator */
	payload?: Record<string, unknown>;
}

/** @returns new plan with the given link added to the path */
export function appendPath(plan: Plan, link: PlanLink): Plan {
	return { ...plan, path: [...plan.path, link] };
}
