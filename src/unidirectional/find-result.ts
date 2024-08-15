import { IdentifiedMember, PrivateLink } from "..";

export interface PeerMatch {
	readonly match: Match; // Peer member details
	readonly link: PrivateLink; // Link to peer
}

export interface Match {
	readonly member: IdentifiedMember;
	readonly dependsOn?: IdentifiedMember[];
}

export interface FindResult {
	/** The member details of the current participant. */
	readonly selfMatch: Match;

	/** Whether the selfMember is a match for the query. */
	readonly selfIsMatch: boolean;

	/** The member details and links to a peer if it matches the query.  This is a list because there may be more than one link to a given peer node.  */
	readonly peerMatch?: PeerMatch[];

	/** Links that are candidates for further searching.  Should be populated, even if the address is found, in case the intents aren't satisfied. */
	readonly candidates?: PrivateLink[];
}
