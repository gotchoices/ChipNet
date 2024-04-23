/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrivateLink } from "../private-link";
import { UniParticipantState } from "./participant-state";
import { UniQuery } from "./query";
import { PlanMember, Plan, PublicLink } from "../plan";
import { Address, addressesMatch } from "../target";
import { CryptoHash } from "chipcryptbase";
import { intentsSatisfied } from "../intent";
import { QueryCandidate } from "./active-query";
import { Pending } from "../pending";
import { QueryResponse } from "../query-struct";
import { TraceFunc } from "../trace";
import { QueryContext } from "./query-context";

export interface PeerAddress {
	address: Address;
	selfReferee: boolean;					// Referee preferences of the peer
	otherMembers?: Record<string, PlanMember>;
	linkId: string;
}

export class MemoryUniParticipantState implements UniParticipantState {
	/** Query contexts by session then link ID */
	private _contexts: Record<string, Record<string, QueryContext>> = {};
	private _peerLinksById: Record<string, PrivateLink> = {};
	private _peerIdentitiesByKey: Record<string, PeerAddress[]> = {};
	private _cycles: { query: UniQuery, path: string[], collisions: string[] }[] = [];
	private _peerOverheads: Record<string, number> = {};
	public defaultOverhead = 30;	// ms

	constructor(
		public readonly cryptoHash: CryptoHash,
		public readonly peerLinks: PrivateLink[],
		public readonly peerAddresses?: PeerAddress[],  	// List of peer addresses, and their link mappings
		public readonly selfAddress?: Address,           // Identity for this node (should provide this or peerIdentities or both)
		public readonly trace?: TraceFunc,
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

	async createContext(
		plan: Plan,
		query: UniQuery,
		linkId?: string,
	): Promise<QueryContext> {
		const plans = await this.search(plan, query);
		if (plans?.length && this.trace) {
			this.trace('search', `node=${this.selfAddress} plans=${plans.map(p => p.path.map(l => l.nonce).join(',')).join('; ')}`);
		}
		if (plans?.length && intentsSatisfied(query.intents, plans)) {
			this.trace?.('satisfied', `intents=${query.intents.map(i => i.code).join(', ')}`);
			return { plan, query, plans };
		} else {
			const links = await this.getCandidates(plan, query);
			const candidates = links.map(l => ({ linkId: l.id, intents: l.intents, depth: 1 } as QueryCandidate));
			this.trace?.('candidates', `candidates=${candidates.map(c => c.linkId).join(', ')}`);
			return {
				plan,
				query,
				...(plans?.length ? { plans } : {}),
				activeQuery: { depth: 1, candidates },
				linkId,
			};
		}
	}

	protected async search(plan: Plan, query: UniQuery): Promise<Plan[] | undefined> {
		// Look at ourself first
		if (this.selfAddress && addressesMatch(this.selfAddress, query.target.address)) {
			return [{ path: [], participants: [], members: {} } as Plan];	// this node will added as a participant up-stack
		}

		const peersForKey = this.getPeerIdentityByKey(query.target.address.key);
		const peer = peersForKey ? peersForKey.find(p => addressesMatch(p.address, query.target.address)) : undefined;
		const link = peer?.linkId ? this.getPeerLinkById(peer?.linkId) : undefined;
		return link
			? [{
				path: [...plan.path, { nonce: await this.cryptoHash.makeNonce(link.id, query.sessionCode), intents: link.intents } as PublicLink],
				participants: [peer!.address.key],
				members: { [peer!.address.key]: { types: peer!.selfReferee ? [1, 2] : [1] }, ...peer!.otherMembers }
			}]
			: undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async getCandidates(plan: Plan, query: UniQuery) {
		return this.peerLinks;
	}

	protected getPeerIdentityByKey(key: string) {
		return this._peerIdentitiesByKey[key];
	}

	protected getPeerLinkById(linkId: string) {
		return this._peerLinksById[linkId];
	}

	async validateNewQuery(sessionCode: string, linkId?: string): Promise<void> {
		const context = this._contexts[sessionCode]?.[linkId ?? ''];
		if (context) {
			throw new Error(`Query '${sessionCode}' already in progress from link ${(linkId ? await this.cryptoHash.makeNonce(linkId, sessionCode) : '')}`);
		}
	}

	async getContext(sessionCode: string, linkId?: string): Promise<QueryContext> {
		const queryState = this._contexts[sessionCode]?.[linkId ?? ''];
		if (!queryState) {
			throw new Error(`Query '${sessionCode}'[${linkId}] from link ${(linkId ? await this.cryptoHash.makeNonce(linkId, sessionCode) : '""')} not found`);
		}
		return queryState;
	}

	async saveContext(context: QueryContext): Promise<void> {
		const linkId = context.linkId ?? '';
		const sessionContext = this._contexts[context.query.sessionCode] ?? (this._contexts[context.query.sessionCode] = {});
		sessionContext[linkId] = context;

		context.activeQuery?.candidates.filter(c => c.request).forEach(c => {
			const request = c.request!;
			if (!request.isComplete) {
				this.logOutstanding(c.linkId, request);
			} else if (request.isError) {
				this.logFailure(c.linkId, errorToString(request.error!));
			} else {
				this.logResponse(c.linkId, request.response!);
			}
		});
	}

	async reportCycles(query: UniQuery, path: string[], collisions: string[]) {
		this._cycles.push({ query, path, collisions });
	}

	async getPeerOverhead(linkId: string): Promise<number> {
		const overhead = this._peerOverheads[linkId];
		return overhead !== undefined ? overhead : this.defaultOverhead;	// don't us ?? because 0 is a valid value
	}

	async reportOverhead(linkId: string, overhead: number): Promise<void> {
		const existing = this._peerOverheads[linkId];
		this._peerOverheads[linkId] = existing !== undefined
			? Math.trunc((existing + overhead * 2) / 3) // weighted moving average
			: overhead;
	}

	async reportTimingViolation(query: UniQuery, linkId: string): Promise<void> {
		// Trace or log
	}

	protected logOutstanding(linkId: string, request: Pending<QueryResponse>) {
		// Trace or log
	}

	protected logFailure(link: string, error: string) {
		// Trace or log
	}

	protected logResponse(link: string, response: QueryResponse) {
		// Trace or log
	}
}

function errorToString(error: unknown) {
	return error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
}
