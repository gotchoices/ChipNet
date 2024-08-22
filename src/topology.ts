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

export function findMember(topology: Topology, address: Address): DependentMember[] {
	return topology.members.filter(m => addressesMatch(m.address, address));
}
