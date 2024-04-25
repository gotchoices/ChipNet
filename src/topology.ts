import { Intent } from "./intent";
import { Member } from "./member";
import { Key, Nonce } from "./types";

export interface Link {
	source: Key;
	target: Key;
	intents: Intent[];
}

export interface Topology {
	members: Record<Key, Member>;	// Nodes by key
	links: Record<Nonce, Link>;	// Links by nonce
}
