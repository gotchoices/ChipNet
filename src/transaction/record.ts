import { Address } from "..";
import { Topology } from "../topology";
import { TrxRecord } from "./record";

export type SignatureType = 1 | -1 | 2 | -2;
export const SignatureTypes = { promise: 1, noPromise: -1, commit: 2, noCommit: -2 } as const;

export interface Signature {
	type: SignatureType; // SignatureType
	address: Address;
	value: string;
}

export interface TrxRecord {
	transactionCode: string;	// Identifier unique to this transaction
	sessionCode: string;    	// Random salt used to anonymize node links
	payload: unknown;
	topology: Topology
	promises: Signature[];
	commits: Signature[];
}export function recordsEqual(a: TrxRecord | undefined, b: TrxRecord | undefined) {
	return !a && !b
		|| (
			a && b
			&& a.transactionCode === b.transactionCode && a.sessionCode === b.sessionCode
			&& JSON.stringify(a.payload) === JSON.stringify(b.payload)
			&& JSON.stringify(a.topology) === JSON.stringify(b.topology)
			&& (a.commits?.length ?? 0) === (b.commits?.length ?? 0)
			&& (a.promises?.length ?? 0) === (b.promises?.length ?? 0)
			&& a.commits.every((c, i) => c.key === b.commits[i].key && c.type === b.commits[i].type && c.value === b.commits[i].value)
			&& a.promises.every((c, i) => c.key === b.promises[i].key && c.type === b.promises[i].type && c.value === b.promises[i].value)
		);
}

