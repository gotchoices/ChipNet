/*
	Note: Plan is distinct from Topology because it is constructed up the tree
	first by path, then back down by participant.
*/

import { Intent } from "./intent";
import { Member, MemberTypes } from "./member";

export interface PublicLink {
	nonce: string;
	intents: Intent[];
}

export interface Plan {
	path: PublicLink[];	// Anonymized links
	participants: string[];	// Node members in path - should have one more entry than path
	members: Record<string, Member>;	// All members (participants, referees, and relays)
}

/** @returns new plan with the given link added to the path */
export function appendPath(plan: Plan, link: PublicLink): Plan {
	return { ...plan, path: [...plan.path, link] };
}

/** @returns new plan with the given participant prepended */
export function prependParticipant(plan: Plan, name: string, member: Member): Plan {
	if (!member.types.includes(MemberTypes.participant)) {
		throw new Error(`Member ${name} must be a participant`);
	}
	return {
		...plan,
		participants: [name, ...plan.participants],
		members: { ...plan.members, [name]: member }
	};
}
