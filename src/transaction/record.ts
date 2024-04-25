import { Topology } from "../topology";

export type SignatureType = 1 | -1 | 2 | -2;
export const SignatureTypes = { promise: 1, noPromise: -1, commit: 2, noCommit: -2 } as const;

export interface Signature {
	type: SignatureType; // SignatureType
	key: string;
	value: string;
}

export interface TrxRecord {
	transactionCode: string;	// Identifier unique to this transaction
	sessionCode: string;    	// Random salt used to anonymize node links
	payload: unknown;
	topology: Topology
	promises: Signature[];
	commits: Signature[];
}
