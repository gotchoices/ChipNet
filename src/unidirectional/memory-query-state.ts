import { QueryResponse } from "../query-func";
import { PrivateLink } from "../private-link";
import { QueryStateContext } from "./query-state";
import { UniQueryState } from "./query-state";
import { UniQuery } from "./query";
import { Plan, PublicLink } from "../plan";
import { addressesMatch } from "../target";
import { MemoryUniParticipantState } from "./memory-participant-state";
import { CryptoHash } from "chipcryptbase";
import { Pending } from "../pending";

export class MemoryUniQueryState implements UniQueryState {
	// TODO: maybe introduce a trace object where stuff like this can be optionally saved. Don't bother saving responses
	//private _responses: Record<string, QueryResponse> = {};
	//private _failures: Record<string, string> = {}; // TODO: structured error information
	private _outstanding: Record<string, Pending<QueryResponse>> = {};
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
			return [{ path: [], participants: [], members: {} } as Plan];	// this node will added as a participant up-stack
		}

		const peersForKey = this.state.getPeerIdentityByKey(this.query.target.address.key);
		const peer = peersForKey ? peersForKey.find(p => addressesMatch(p.address, this.query.target.address)) : undefined;
		const match = peer?.linkId ? this.state.getPeerLinkById(peer?.linkId) : undefined;
		return match
			? [{
				path: [...this.plan.path, { nonce: await this.cryptoHash.makeNonce(match.id, this.query.sessionCode), intent: match.intent } as PublicLink],
				participants: [peer!.address.key],
				members: { [peer!.address.key]: { types: peer!.selfReferee ? [1,2] : [1] }, ...peer!.otherMembers }
			}]
			: undefined;
	}

	async getCandidates(): Promise<PrivateLink[]> {
		return this.state.peerLinks;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private addFailure(link: string, error: string) {
		// Disabled for now
		//this._failures[link] = error;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private addResponse(link: string, response: QueryResponse) {
		// Disabled for now
		//this._responses[link] = response;
	}

	private addOutstanding(link: string, response: Pending<QueryResponse>) {
		this._outstanding[link] = response;
	}

	async recallRequests(): Promise<Record<string, Pending<QueryResponse>>> {
		return this._outstanding;
	}

	async storeRequests(requests: Record<string, Pending<QueryResponse>>) {
		this._outstanding = {};
		Object.entries(requests).forEach(([link, r]) => {
			if (!r.isComplete) {
				this.addOutstanding(link, r);
			} else if (r.isError) {
				this.addFailure(link, errorToString(r.error!));
			} else {
				this.addResponse(link, r.response!);
			}
		});
	}

	async getContext(): Promise<QueryStateContext | undefined> {
		return this._context;
	}

	async saveContext(context: QueryStateContext): Promise<void> {
		this._context = context;
	}
}

function errorToString(error: unknown) {
	return error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
}
