import { Plan } from "../plan";

export const SignatureType = { promise: 1, nopromise: -1, commit: 2, nocommit: -2 } as const;

export interface Signature {
	type: number; // SignatureType
	key: string;
	value: string;
}

export interface TrxRecord {
	transactionId: string;    // Hash code used to anonymize node links
	plan: Plan;
	promises: Signature[];
	commits: Signature[];
}
