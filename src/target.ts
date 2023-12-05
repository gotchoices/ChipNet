export interface Address {
	key: string;				// perminant or ephemeral public key of target
	identity?: string;	// optional public identity at target, if key doesn't completely identify the target
}

export function addressesMatch(a1: Address, a2: Address) {
	return a1.key === a2.key && (a1.identity ?? null) === (a2.identity ?? null);
}

export interface TargetSecret {
	identity?: string;		// optional hidden identity at the target
	originatorAddress?: string;	// physical address of the originator (connection uses transaction ID to connect)
	reference?: string;	// reference info (e.g. invoice #) to give to the target
}

export interface PrivateTarget {
	address: Address;
	unsecret?: TargetSecret;	// unencrypted secret info to encrypted using the target key
}

export interface PublicTarget {
	address: Address;
	secret?: string;	// encrypted secret info to encrypted using the target key
}
