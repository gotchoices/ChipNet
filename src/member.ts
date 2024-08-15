import { Address } from "./address";

/** Note: All nodes can act as relays. */
export type MemberType = 'P' | 'R';
export const MemberTypes: Record<string, MemberType> = { participant: 'P', referee: 'R' } as const;

export interface Member {
	/** Optional physical multiaddress of member */
	readonly physical?: string;
	/** Member encrypted private data (auth token, etc.) */
	readonly secret?: string;
	readonly types: MemberType[];
	/** If true, don't cache this member's address - it's likely ephemeral; Default: false */
	readonly noCache?: boolean;
}

export interface IdentifiedMember extends Member {
	readonly address: Address;
}

export interface DependentMember extends IdentifiedMember {
	readonly dependsOn?: Address[];	// Other members this member nominates
}
