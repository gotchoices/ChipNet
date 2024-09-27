export interface Address {
	/** Unique key for this member - also an encryption public key */
	readonly key: string;
	/** Optional additional user identity of the target, if key doesn't completely identify the target */
	readonly cuid?: string;
}

/** Returns true if the given addresses refer to the same local entity */
export function addressesMatch(a1: Address, a2: Address) {
	return a1.key === a2.key && (a1.cuid ?? null) === (a2.cuid ?? null);
}

