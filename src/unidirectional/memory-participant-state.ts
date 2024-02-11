import { PrivateLink } from "../private-link";
import { UniParticipantState } from "./participant-state";
import { UniQueryState } from "./query-state";
import { UniQuery } from "./query";
import { ExternalReferee, Plan } from "../plan";
import { Address } from "../target";
import { MemoryUniQueryState } from "./memory-query-state";
import { CryptoHash } from "chipcryptbase";

export interface PeerAddress {
	address: Address;
	selfReferee: boolean;					// Referee preferences of the peer
	externalReferees?: ExternalReferee[];
	linkId: string;
}

export class MemoryUniParticipantState implements UniParticipantState {
	private _statesBySession: Record<string, Record<string, UniQueryState>> = {};
	private _peerLinksById: Record<string, PrivateLink> = {};
	private _peerIdentitiesByKey: Record<string, PeerAddress[]> = {};
	private _cycles: { query: UniQuery, path: string[], collisions: string[] }[] = [];

	constructor(
		public readonly cryptoHash: CryptoHash,
		public readonly peerLinks: PrivateLink[],
		public readonly peerAddresses?: PeerAddress[],  	// List of peer addresses, and their link mappings
		public readonly selfAddress?: Address,           // Identity for this node (should provide this or peerIdentities or both)
	) {
		peerLinks.forEach(l => this._peerLinksById[l.id] = l);
		if (peerAddresses) {
			peerAddresses.forEach(i => {
				if (!this._peerIdentitiesByKey[i.address.key]) {
					this._peerIdentitiesByKey[i.address.key] = [];
				}
				this._peerIdentitiesByKey[i.address.key].push(i);
			});
		}
	}

	async createQueryState(plan: Plan, query: UniQuery, linkId?: string): Promise<UniQueryState> {
		let entry = this._statesBySession[query.sessionCode];
		if (entry && Object.prototype.hasOwnProperty.call(entry, linkId ?? '')) {
			throw new Error(`Query '${query.sessionCode}' already in progress`);
		}
		if (!entry) {
			entry = {};
			this._statesBySession[query.sessionCode] = entry;
		}
		const result = new MemoryUniQueryState(this, plan, query, this.cryptoHash);
		entry[linkId ?? ''] = result;
		return result;
	}

	async getQueryState(sessionCode: string, linkId?: string): Promise<UniQueryState> {
		const queryState = this._statesBySession[sessionCode]?.[linkId ?? ''];
		if (!queryState) {
			throw new Error(`Query '${sessionCode}'[${linkId}] not found`);
		}
		return queryState;
	}

	async reportCycles(query: UniQuery, path: string[], collisions: string[]) {
		this._cycles.push({ query, path, collisions });
	}

	getPeerIdentityByKey(key: string) {
		return this._peerIdentitiesByKey[key];
	}

	getPeerLinkById(id: string) {
		return this._peerLinksById[id];
	}
}
