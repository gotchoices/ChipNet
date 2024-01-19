import { MatchTermsFunc, SendUniFunc } from "./callbacks";
import { StepResponse } from "../sequencing";
import { PrivateLink } from "../private-link";
import { UniParticipantOptions } from "./participant-options";
import { UniParticipantState, UniSearchResult } from "./participant-state";
import { UniQuery } from "./query";
import { UniResponse } from "./response";
import { ExternalReferee, Participant, Plan, PublicLink } from "../plan";
import { Address, addressesMatch } from "../target";
import { makeNonce } from "chipcode";
import { Asymmetric, KeyPairBin, arrayToBase64 } from "chipcryptbase";
import { Terms } from "../types";

export interface PeerAddress {
	address: Address;
	selfReferee: boolean;					// Referee preferences of the peer
	externalReferees?: ExternalReferee[];
	linkId: string;
}

export class MemoryUniParticipantState implements UniParticipantState {
	private _cycles: { query: UniQuery, path: string[], collisions: string[] }[] = [];
	private _responses: Record<string, UniResponse> = {};
	private _failures: Record<string, string> = {};  // TODO: structured error information
	private _phaseTime: number = 0;
	private _peerLinksById: Record<string, PrivateLink> = {};
	private _peerIdentitiesByKey: Record<string, PeerAddress[]> = {};
	private _keyPair: KeyPairBin;

	constructor(
		public options: UniParticipantOptions,
		public peerLinks: PrivateLink[],
		public matchTerms: MatchTermsFunc,
		private asymmetric: Asymmetric,
		public peerAddresses?: PeerAddress[],  	// List of peer addresses, and their link mappings
		public selfAddress?: Address,           // Identity for this node (should provide this or peerIdentities or both)
	) {
		this._keyPair = asymmetric.generateKeyPairBin();
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

	async getKeyPair() {
		return this._keyPair;
	}

	async reportCycles(query: UniQuery, path: string[], collisions: string[]) {
		this._cycles.push({ query, path, collisions });
	}

	async search(plan: Plan, query: UniQuery) {
		const route = await this.getMatch(plan, query);
		const candidates = route ? undefined : await this.getCandidates(query);
		return { route, candidates } as UniSearchResult;
	}

	private async getParticipant(): Promise<Participant> {
		return {
			key: arrayToBase64(this._keyPair.publicKey),
			isReferee: this.options.selfReferee,
			// secret - we do not need this
		}
	}

	private async getMatch(plan: Plan, query: UniQuery) {
		// Look at ourself first
		if (this.selfAddress && addressesMatch(this.selfAddress, query.target.address)) {
			const participant = await this.getParticipant();
			return { path: [], participants: [participant], externalReferees: this.options.externalReferees } as Plan;
		}

		const peersForKey = this.peerAddresses ? this._peerIdentitiesByKey[query.target.address.key] : undefined;
		const peer = peersForKey ? peersForKey.find(p => addressesMatch(p.address, query.target.address)) : undefined;
		const match = peer?.linkId ? this._peerLinksById[peer?.linkId] : undefined;
		const terms = match ? await this.negotiateTerms(match.terms, query.terms) : undefined;
		return match && terms
			? await this.negotiatePlan({
					path: [...plan.path, { nonce: makeNonce(match.id, query.sessionCode), terms } as PublicLink],
					participants: [{ key: peer!.address.key, isReferee: peer!.selfReferee }],
					externalReferees: peer!.externalReferees
			})
			: undefined;
	}

	async negotiatePlan(plan: Plan) {
		return this.options.externalReferees
			? { ...plan, externalReferees: concatExternalReferees(plan.externalReferees ?? [], this.options.externalReferees) }
			: plan;
	}

	async negotiateTerms(linkTerms: Terms, queryTerms: Terms): Promise<Terms | undefined> {
		return this.matchTerms(linkTerms, queryTerms);
	}

	private async getCandidates(query: UniQuery): Promise<PrivateLink[]> {
		return this.peerLinks.map(link => ({ id: link.id, terms: this.negotiateTerms(link.terms, query.terms) } as PrivateLink))
			.filter(l => l.terms);
	}

	/**
	 * @returns The currently failed requests.  Do not mutate
	 */
	getFailures() {
		return this._failures;
	}

	private addFailure(link: string, error: string) {
		this._failures[link] = error;
	}

	getResponse(link: string): UniResponse | undefined {
		return this._responses[link];
	}

	private addResponse(link: string, response: UniResponse) {
		this._responses[link] = response;
	}

	async completeStep(phaseResponse: StepResponse) {
		Object.entries(phaseResponse.failures).forEach(([link, error]) =>
			this.addFailure(link, error));

		Object.entries(phaseResponse.results).forEach(([link, response]) =>
			this.addResponse(link, response));

		this._phaseTime = Math.max(phaseResponse.actualTime, this._phaseTime);    // (don't allow a quickly returning depth prevent giving time for propagation)
	}
}

/** returns desired set of referees (currently deduplicated union) */
function concatExternalReferees(referees1: ExternalReferee[], referees2: ExternalReferee[]) {
	return referees1.concat(referees2.filter(r2 => !referees1.find(r1 => r1.key === r2.key)));
}

