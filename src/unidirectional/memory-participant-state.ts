import { MatchTermsFunc } from "../query-func";
import { PrivateLink } from "../private-link";
import { UniParticipantOptions } from "./participant-options";
import { UniParticipantState } from "./participant-state";
import { UniQueryState } from "./query-state";
import { UniQuery } from "./query";
import { ExternalReferee, Participant, Plan } from "../plan";
import { Address } from "../target";
import { AsymmetricVault } from "chipcryptbase";
import { MemoryUniQueryState } from "./memory-query-state";

export interface PeerAddress {
	address: Address;
	selfReferee: boolean;					// Referee preferences of the peer
	externalReferees?: ExternalReferee[];
	linkId: string;
}

export class MemoryUniParticipantState implements UniParticipantState {
	private _statesBySession: Record<string, UniQueryState> = {};
	private _peerLinksById: Record<string, PrivateLink> = {};
	private _peerIdentitiesByKey: Record<string, PeerAddress[]> = {};
	private _cycles: { query: UniQuery, path: string[], collisions: string[] }[] = [];

	constructor(
		public readonly options: UniParticipantOptions,
		public readonly peerLinks: PrivateLink[],
		public readonly matchTerms: MatchTermsFunc,
		public readonly asymmetricVault: AsymmetricVault,
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

	async createQueryState(plan: Plan, query: UniQuery): Promise<UniQueryState> {
		const existing = this._statesBySession[query.sessionCode];
		if (existing) {
			throw new Error(`Query '${query.sessionCode}' already in progress`);
		}
		const result = new MemoryUniQueryState(this, plan, query);
		this._statesBySession[query.sessionCode] = result;
		return result;
	}

	async getQueryState(sessionCode: string): Promise<UniQueryState> {
		const queryState = this._statesBySession[sessionCode];
		if (!queryState) {
			throw new Error(`Query '${sessionCode}' not found`);
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

	async getParticipant(): Promise<Participant> {
		return {
			key: await this.asymmetricVault.getPublicKeyAsString(),
			isReferee: this.options.selfReferee,
			// secret - we do not need this
		}
	}
}
