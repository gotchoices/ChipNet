import { Address } from ".";

export type TargetSecret = Record<string, unknown>;

export interface PrivateTarget {
	address: Address;
	/** optional physical address of target */
	physical?: string;
	/** unencrypted secret info to encrypted using the target key */
	unsecret?: TargetSecret;
}

export interface PublicTarget {
	address: Address;
	/** optional physical address of target */
	physical?: string;
	/** encrypted secret info for the target, encrypted using the target key */
	secret?: string;
}
