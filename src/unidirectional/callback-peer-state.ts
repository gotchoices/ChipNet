import { CryptoHash } from "chipcryptbase";
import { Address, MemberDetail, Plan, PrivateLink, PublicLink, UniQuery, addressesMatch } from "..";
import { PeerState } from "./peer-state";
import { PeerAddress } from "./peer-address";

export class CallbackPeerState implements PeerState {
	private _peerLinksById: Record<string, PrivateLink> = {};
	private _peerIdentitiesByKey: Record<string, PeerAddress[]> = {};

	constructor(
		public readonly cryptoHash: CryptoHash,
		public readonly getPeerLinks: (query?: UniQuery) => Promise<PrivateLink[]>,
		public readonly getPeerLink: (linkId: string) => Promise<PrivateLink>,
		public readonly getPeerAddress?: (query: UniQuery) => Promise<PeerAddress | undefined>,  	// Get peer address for a given query
		public readonly selfAddress?: Address,           // Identity for this node (should provide this or peerIdentities or both)
	) {
	}

	async search(plan: Plan, query: UniQuery): Promise<Plan[] | undefined> {
		// Look at ourself first
		if (this.selfAddress && addressesMatch(this.selfAddress, query.target.address)) {
			return [{ sessionCode: query.sessionCode,  path: [...plan.path], participants: [], members: {} } as Plan];	// this node will added as a participant up-stack
		}

		const peer = await this.getPeerAddress?.(query);
		const link = peer?.linkId ? await this.getPeerLink(peer?.linkId) : undefined;
		return link
			? [{
				path: [...plan.path, { nonce: await this.cryptoHash.makeNonce(link.id, query.sessionCode), intents: link.intents } as PublicLink],
				participants: [peer!.address.key],
				members: { [peer!.address.key]: { types: peer!.selfReferee ? ['P', 'R'] : ['P'] } as MemberDetail, ...peer!.otherMembers }
			} as Plan]
			: undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getCandidates(plan: Plan, query: UniQuery) {
		return this.getPeerLinks(query);
	}

	async getPeerLinksByNonce(sessionCode: string): Promise<Record<string, string>> {
		const peerLinks = await this.getPeerLinks();
		const nonces = await Promise.all(peerLinks.map(l => this.cryptoHash.makeNonce(l.id, sessionCode)));
		return Object.fromEntries(nonces.map((n, i) => [n, peerLinks[i].id]));
	}
}
