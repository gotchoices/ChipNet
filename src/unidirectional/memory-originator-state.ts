import { UniOriginatorOptions } from "./originator-options";
import { UniQuery } from "./query";
import { Intent } from "../intent";
import { UniOriginatorState } from "./originator-state";
import { PrivateLink } from "../private-link";
import { PrivateTarget, PublicTarget } from "../target";
import { AsymmetricVault, CryptoHash } from "chipcryptbase";

/** Simple memory based implementation of Uni state */
export class MemoryUniOriginatorState implements UniOriginatorState {
	_learnedGrowth: number | undefined;

	constructor(
		public readonly options: UniOriginatorOptions,
		public readonly peerLinks: PrivateLink[],
		public readonly asymmetricVault: AsymmetricVault,	// Asymmetric crypto implementation
		public readonly query: UniQuery,
	) {
	}

	static async build(
		options: UniOriginatorOptions,
		peerLinks: PrivateLink[],
		asymmetricVault: AsymmetricVault,
		cryptoHash: CryptoHash,
		target: PrivateTarget,
		intents: Intent[],
	) {
		const sessionCode = await cryptoHash.generate();
		const secret = target.unsecret ? await asymmetricVault.encrypt(JSON.stringify(target.unsecret)) : undefined;
		const publicTarget = { address: target.address, secret } as PublicTarget;
		const query = { target: publicTarget, sessionCode, intents };
		return new MemoryUniOriginatorState(options, peerLinks, asymmetricVault, query);
	}

	/** The time budget growth-rate from historical experience */
	async getLearnedGrowth(): Promise<number | undefined> {
		return this._learnedGrowth;
	}

	/** Record the time budget growth-rate from the last sequence */
	recordGrowth(growth: number): void {
		this._learnedGrowth = this._learnedGrowth === undefined
			? growth
			: (this._learnedGrowth + (growth - this._learnedGrowth) * 0.25);	// Move towards, but don't entirely accept a sample
	}
}
