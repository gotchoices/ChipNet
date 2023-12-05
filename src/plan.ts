import { Terms } from "./types";

export interface PublicLink {
	nonce: string;
	terms: Terms;
}

export interface ExternalReferee {
	key: string;			// Potentially transient identifier and public key
	url: string;	// Logical and physical address of external referee
}

export interface Participant {
	key: string;			// Transient identifier and public key
	secret?: string;	// Encrypted path segment or other agent memory
	isReferee: boolean;
}

export interface Plan {
	path: PublicLink[];	// Anonymized links
	participants: Participant[];	// Nodes - should have one more entry than path
	externalReferees?: ExternalReferee[];	// Referees that are not participants
}
