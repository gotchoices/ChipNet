import { CryptoHash } from "chipcryptbase";
import { Address, MemberDetail, Plan, PrivateLink, PublicLink, UniQuery, addressesMatch } from "..";
import { PeerState } from "./peer-state";
import { PeerAddress } from "./peer-address";

export class MemoryPeerState implements PeerState {
	private _peerLinksById: Record<string, PrivateLink> = {};
	private _peerIdentitiesByKey: Record<string, PeerAddress[]> = {};

	constructor(
		public readonly cryptoHash: CryptoHash,
		public readonly peerLinks: PrivateLink[],
		public readonly peerAddresses?: PeerAddress[],  	// List of peer addresses, and their link mappings
		public readonly selfAddress?: Address,           // Identity for this node (should provide this or peerIdentities or both)
	) {
		peerLinks.forEach(l => { this._peerLinksById[l.id] = l; });
		if (peerAddresses) {
			peerAddresses.forEach(i => {
				if (!this._peerIdentitiesByKey[i.address.key]) {
					this._peerIdentitiesByKey[i.address.key] = [];
				}
				this._peerIdentitiesByKey[i.address.key].push(i);
			});
		}
	}

	async search(plan: Plan, query: UniQuery): Promise<Plan[] | undefined> {
		// Look at ourself first
		if (this.selfAddress && addressesMatch(this.selfAddress, query.target.address)) {
			return [{ sessionCode: query.sessionCode,  path: [...plan.path], participants: [], members: {} } as Plan];	// this node will added as a participant up-stack
		}

		const peersForKey = this.getPeerIdentityByKey(query.target.address.key);
		const peer = peersForKey ? peersForKey.find(p => addressesMatch(p.address, query.target.address)) : undefined;
		const link = peer?.linkId ? this.getPeerLinkById(peer?.linkId) : undefined;
		return link
			? [{
				path: [...plan.path, { nonce: await this.cryptoHash.makeNonce(link.id, query.sessionCode), intents: link.intents } as PublicLink],
				participants: [peer!.address.key],
				members: { [peer!.address.key]: { types: peer!.selfReferee ? ['P', 'R'] : ['P'] } as MemberDetail, ...peer!.otherMembers }
			} as Plan]
			: undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getCandidates(plan: Plan, query: UniQuery) {
		return this.peerLinks;
	}

	protected getPeerIdentityByKey(key: string) {
		return this._peerIdentitiesByKey[key];
	}

	protected getPeerLinkById(linkId: string) {
		return this._peerLinksById[linkId];
	}

	async getPeerLinksByNonce(sessionCode: string): Promise<Record<string, string>> {
		const nonces = await Promise.all(this.peerLinks.map(l => this.cryptoHash.makeNonce(l.id, sessionCode)));
		return Object.fromEntries(nonces.map((n, i) => [n, this.peerLinks[i].id]));
	}
}
