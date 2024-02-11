import { UniOriginatorOptions } from "./originator-options";
import { UniQuery } from "./query";
import { UniOriginatorState } from "./originator-state";
import { PrivateLink } from "../private-link";
import { Terms } from "../types";
import { PrivateTarget, PublicTarget } from "../target";
import { AsymmetricVault, CryptoHash } from "chipcryptbase";

/** Simple memory based implementation of Uni state */
export class MemoryUniOriginatorState implements UniOriginatorState {
	constructor(
		public options: UniOriginatorOptions,
		public peerLinks: PrivateLink[],
		public asymmetricVault: AsymmetricVault,	// Asymmetric crypto implementation
		public readonly query: UniQuery,
	) {
	}

	static async build(
		options: UniOriginatorOptions,
		peerLinks: PrivateLink[],
		asymmetricVault: AsymmetricVault,
		cryptoHash: CryptoHash,
		target: PrivateTarget,
		terms: Terms,
	) {
		const sessionCode = await cryptoHash.generate();
		const secret = target.unsecret ? await asymmetricVault.encrypt(JSON.stringify(target.unsecret)) : undefined;
		const publicTarget = { address: target.address, secret } as PublicTarget;
		const query = { target: publicTarget, sessionCode, terms: terms };
		return new MemoryUniOriginatorState(options, peerLinks, asymmetricVault, query);
	}
}
