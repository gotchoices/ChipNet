import { TargetSecret } from "./target-secret";

// WARNING: If anything changes in these structure, be sure to update queryContextNameMap

export interface Address {
	/** public key of target, whether private or public, ephemeral or persistant */
	key: string;
	/** optional additional identity of the target, if key doesn't completely identify the target */
	identity?: string;
	/** true if the address is a hidden or transient identity - don't cache if true */
	isPrivate?: boolean;
}

/** Returns true if the given addresses are equal. */
export function addressesMatch(a1: Address, a2: Address) {
	return a1.key === a2.key && (a1.identity ?? null) === (a2.identity ?? null);
}

export interface PrivateTarget {
	address: Address;
	/** unencrypted secret info to encrypted using the target key */
	unsecret?: TargetSecret;
}

export interface PublicTarget {
	address: Address;
	/** encrypted secret info for the target, encrypted using the target key */
	secret?: string;
}
