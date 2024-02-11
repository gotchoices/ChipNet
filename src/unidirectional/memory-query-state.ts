import { QueryResponse } from "../query-func";
import { StepResponse } from "../sequencing";
import { PrivateLink } from "../private-link";
import { QueryStateContext } from "./query-state";
import { UniQueryState } from "./query-state";
import { UniQuery } from "./query";
import { Plan, PublicLink } from "../plan";
import { addressesMatch } from "../target";
import { MemoryUniParticipantState } from "./memory-participant-state";
import { CryptoHash } from "chipcryptbase";

export class MemoryUniQueryState implements UniQueryState {
	private _responses: Record<string, QueryResponse> = {};
	private _outstanding: Record<string, Promise<QueryResponse>> = {};
	private _failures: Record<string, string> = {}; // TODO: structured error information
	private _phaseTime: number = 0;
	private _context?: QueryStateContext;

	constructor(
		public readonly state: MemoryUniParticipantState,
		public readonly plan: Plan,
		public readonly query: UniQuery,
		public readonly cryptoHash: CryptoHash,
	) { }

	async search(): Promise<Plan[] | undefined> {
		// Look at ourself first
		if (this.state.selfAddress && addressesMatch(this.state.selfAddress, this.query.target.address)) {
			return [{ path: [], participants: [] } as Plan];	// this node will added as a participant up-stack
		}

		const peersForKey = this.state.getPeerIdentityByKey(this.query.target.address.key);
		const peer = peersForKey ? peersForKey.find(p => addressesMatch(p.address, this.query.target.address)) : undefined;
		const match = peer?.linkId ? this.state.getPeerLinkById(peer?.linkId) : undefined;
		return match
			? [{
				path: [...this.plan.path, { nonce: await this.cryptoHash.makeNonce(match.id, this.query.sessionCode), terms: match.terms } as PublicLink],
				participants: [{ key: peer!.address.key, isReferee: peer!.selfReferee }],
				externalReferees: peer!.externalReferees
			}]
			: undefined;
	}

	async getCandidates(): Promise<PrivateLink[]> {
		return this.state.peerLinks;
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

	private addResponse(link: string, response: QueryResponse) {
		this._responses[link] = response;
	}

	private addOutstanding(link: string, response: Promise<QueryResponse>) {
		this._outstanding[link] = response;
	}

	async startStep(): Promise<Record<string, Promise<QueryResponse>>> {
		return this._outstanding;
	}

	async completeStep(phaseResponse: StepResponse<QueryResponse>) {
		Object.entries(phaseResponse.failures).forEach(([link, error]) => this.addFailure(link, error));

		Object.entries(phaseResponse.results).forEach(([link, response]) => this.addResponse(link, response));

		this._outstanding = {};
		Object.entries(phaseResponse.outstanding).forEach(([link, response]) => this.addOutstanding(link, response));
	}

	async getContext(): Promise<QueryStateContext | undefined> {
		return this._context;
	}

	async saveContext(context: QueryStateContext): Promise<void> {
		this._context = context;
	}
}
