import { Address, addressesMatch } from "..";
import { Topology } from "../topology";

export type SignatureType = 'P' | 'NP' | 'C' | 'NC';
export const SignatureTypes = { promise: 'P', noPromise: 'NP', commit: 'C', noCommit: 'NC' } as const;

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
}

export function recordsEqual(a: TrxRecord | undefined, b: TrxRecord | undefined) {
	return !a && !b
		|| (
			a && b
			&& a.transactionCode === b.transactionCode && a.sessionCode === b.sessionCode
			&& JSON.stringify(a.payload) === JSON.stringify(b.payload)
			&& JSON.stringify(a.topology) === JSON.stringify(b.topology)
			&& (a.commits?.length ?? 0) === (b.commits?.length ?? 0)
			&& (a.promises?.length ?? 0) === (b.promises?.length ?? 0)
			&& a.commits.every((c, i) => addressesMatch(c.address, b.commits[i].address) && c.type === b.commits[i].type && c.value === b.commits[i].value)
			&& a.promises.every((c, i) => addressesMatch(c.address, b.promises[i].address) && c.type === b.promises[i].type && c.value === b.promises[i].value)
		);
}

