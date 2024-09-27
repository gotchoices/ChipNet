import { Address, addressesMatch } from ".";
import { Intent } from "./intent";
import { DependentMember } from "./member";
import { Nonce } from "./types";

export interface Link {
	source: Address;
	target: Address;
	intents: Intent[];
}

export interface Topology {
	members: DependentMember[];	// Nodes
	links: Record<Nonce, Link>;	// Links by nonce
}

export function findMembers(topology: Topology, address: Address): { member: DependentMember, index: number }[] {
	return topology.members.map((m, i) => ({ member: m, index: i }))
		.filter(({ member }) => addressesMatch(member.address, address))
		.map(({ member, index }) => ({ member, index }));
}
