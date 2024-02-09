import { QueryResponse } from "../query-func";
import { StepResponse } from "../sequencing";
import { PrivateLink } from "../private-link";
import { QueryStateContext, UniSearchResult } from "./query-state";
import { UniQueryState } from "./query-state";
import { UniQuery } from "./query";
import { ExternalReferee, Participant, Plan, PublicLink } from "../plan";
import { addressesMatch } from "../target";
import { makeNonce } from "chipcode";
import { Terms } from "../types";
import { MemoryUniParticipantState } from "./memory-participant-state";

export class MemoryUniQueryState implements UniQueryState {
	private _responses: Record<string, QueryResponse> = {};
	private _outstanding: Record<string, Promise<QueryResponse>> = {};
	private _failures: Record<string, string> = {}; // TODO: structured error information
	private _phaseTime: number = 0;
	private _context?: QueryStateContext;

	constructor(
		public readonly state: MemoryUniParticipantState,
		public readonly plan: Plan,
		public readonly query: UniQuery
	) { }

	async search() {
		const plans = await this.getMatches();
		const candidates = plans ? undefined : await this.getCandidates();
		return { plans, candidates } as UniSearchResult;
	}

	private async getParticipant(): Promise<Participant> {
		return {
			key: await this.state.asymmetricVault.getPublicKeyAsString(),
			isReferee: this.state.options.selfReferee,
			// secret - we do not need this
		};
	}

	private async getMatches(): Promise<Plan[] | undefined> {
		// Look at ourself first
		if (this.state.selfAddress && addressesMatch(this.state.selfAddress, this.query.target.address)) {
			const participant = await this.getParticipant();
			return [{ path: [], participants: [participant], externalReferees: this.state.options.externalReferees } as Plan];
		}

		const peersForKey = this.state.getPeerIdentityByKey(this.query.target.address.key);
		const peer = peersForKey ? peersForKey.find(p => addressesMatch(p.address, this.query.target.address)) : undefined;
		const match = peer?.linkId ? this.state.getPeerLinkById(peer?.linkId) : undefined;
		const terms = match ? await this.negotiateTerms(match.terms, this.query.terms) : undefined;
		return match && terms
			? [await this.negotiatePlan({
				path: [...this.plan.path, { nonce: makeNonce(match.id, this.query.sessionCode), terms } as PublicLink],
				participants: [{ key: peer!.address.key, isReferee: peer!.selfReferee }],
				externalReferees: peer!.externalReferees
			})]
			: undefined;
	}

	async negotiatePlan(plan: Plan) {
		return this.state.options.externalReferees
			? { ...plan, externalReferees: concatExternalReferees(plan.externalReferees ?? [], this.state.options.externalReferees) }
			: plan;
	}

	async negotiateTerms(linkTerms: Terms, queryTerms: Terms): Promise<Terms | undefined> {
		return this.state.matchTerms(linkTerms, queryTerms);
	}

	private async getCandidates(): Promise<PrivateLink[]> {
		return (await Promise.all(this.state.peerLinks.map(async (link) => ({ id: link.id, terms: await this.negotiateTerms(link.terms, this.query.terms) } as PrivateLink))))
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

/** returns desired set of referees (currently deduplicated union) */
function concatExternalReferees(referees1: ExternalReferee[], referees2: ExternalReferee[]) {
	return referees1.concat(referees2.filter(r2 => !referees1.find(r1 => r1.key === r2.key)));
}
