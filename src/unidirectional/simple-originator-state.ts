import { UniOriginatorOptions } from "./originator-options";
import { UniRequest } from "./request";
import { UniResponse } from "./response";
import { UniQuery } from "./query";
import { generateTransactionId, nonceFromLink } from "../transaction-id";
import { UniOriginatorState } from "./originator-state";
import { SequenceResponse } from "../sequencing";
import { PrivateLink } from "../private-link";
import { Terms } from "../types";
import { PrivateTarget, PublicTarget, TargetSecret } from "../target";
import { Participant } from "../plan";
import { KeyPair, encryptWithPublicKey, generateKeyPair } from "../asymmetric";

/** Simple memory based implementation of Uni state */
export class SimpleUniOriginatorState implements UniOriginatorState {
	private _responses: Record<string, UniResponse> = {};
	private _outstanding: Record<string, UniRequest> = {};
	private _failures: Record<string, string> = {};  // TODO: structured error information
	private _query: UniQuery;
	private _noncesByLink: Record<string, string>;
	private _lastTime = 0;
	private _lastDepth = 1;
	private _keyPair: KeyPair;

	get query() { return this._query; }

	constructor(
		public options: UniOriginatorOptions,
		public peerLinks: PrivateLink[],
		public target: PrivateTarget,  // Target address and other information
		public terms: Terms,   // Arbitrary query data to be passed to the target for matching
		public targetAddress?: string,	// Optional target physical address
	) {
		this._keyPair = generateKeyPair();
		const transactionId = generateTransactionId(this.options.transactionIdOptions);
		const secret = target.unsecret ? encryptWithPublicKey(this._keyPair.publicKey, JSON.stringify(target.unsecret)) : undefined;
		const publicTarget = { address: target.address, secret } as PublicTarget;
		this._query = { target: publicTarget, transactionId: transactionId, terms: this.terms };
		this._noncesByLink = this.peerLinks.reduce((c, link) => {
			c[link.id] = nonceFromLink(link.id, transactionId);;
			return c;
		}, {} as Record<string, string>
		);
	}

	async getParticipant(): Promise<Participant> {
		return {
			key: this._keyPair.publicKey,
			isReferee: this.options.selfReferee,
			// secret - we do not need this
		}
	}

	async getDepth(): Promise<number> {
		return this._lastDepth;
	}

	async startPhase(depth: number) {
		this._lastDepth = depth;
	}

	async completePhase(phaseResponse: SequenceResponse) {
		Object.entries(phaseResponse.failures).forEach(([link, error]) =>
			this.addFailure(link, error));

		Object.entries(phaseResponse.results).forEach(([link, response]) =>
			this.addResponse(link, response));

		this._lastTime = phaseResponse.actualTime;
	}

	async getLastTime() {
		return this._lastTime;
	}

	/** @returns The nodes peer links.  Do not mutate */
	async getPeerLinks() {
		return this.peerLinks;
	}

	async getRoutes() {
		return Object.entries(this._responses)
			.flatMap(([link, response]) => response.plans.flatMap(p => response.plans))
	}

	/**
	 * @returns The currently failed requests.  Do not mutate
	 */
	async getFailures() {
		return this._failures;
	}

	private addFailure(link: string, error: string) {
		this._failures[link] = error;
		delete this._outstanding[link];
	}

	async getResponse(link: string): Promise<UniResponse | undefined> {
		return this._responses[link];
	}

	private addResponse(link: string, response: UniResponse) {
		this._responses[link] = response;
		delete this._outstanding[link];
	}

	/**
	 * @returns The currently outstanding requests.  Do not mutate
	 */
	async getOutstanding() {
		return this._outstanding;
	}

	async addOutstanding(link: string, request: UniRequest) {
		this._outstanding[link] = request;
	}

	async shouldAdvance(link: string) {
		// Can advance if hasn't failed, already been queued, or responded with no data
		return !this._failures[link]
			&& !this._outstanding[link]
			&& (!this._responses.hasOwnProperty(link) || Boolean(this._responses[link]?.hiddenReentrance));
	}

	getNonce(link: string) {
		const result = this._noncesByLink[link];
		if (!result) {
			throw Error("Unable to find nonce for link");
		}
		return result;
	}
}
