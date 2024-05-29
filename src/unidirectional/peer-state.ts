import { Address, Plan, PrivateLink, UniQuery } from "..";

export interface PeerState {
	/** The (optional) address of the current participant. */
	readonly selfAddress?: Address;

	/** Searches for the target node in the given plan */
	search(plan: Plan, query: UniQuery): Promise<Plan[] | undefined>;

	/** Returns the list of candidate links for the given query */
	getCandidates(plan: Plan, query: UniQuery): Promise<PrivateLink[]>;
}
