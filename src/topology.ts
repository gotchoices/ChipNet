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

export function findMember(topology: Topology, address: Address): DependentMember | undefined {
	return topology.members.find(m => addressesMatch(m.address, address));
}
