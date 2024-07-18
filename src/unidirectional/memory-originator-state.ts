import { UniOriginatorOptions } from "./originator-options";
import { UniOriginatorState } from "./originator-state";
import { PrivateLink } from "../private-link";
import { TraceFunc } from "..";

/** Simple memory based implementation of Uni state */
export class MemoryUniOriginatorState implements UniOriginatorState {
	_learnedGrowth: number | undefined;

	constructor(
		public readonly options: UniOriginatorOptions,
		public readonly peerLinks: PrivateLink[],
		public readonly trace?: TraceFunc,
	) {
	}

	static async build(
		options: UniOriginatorOptions,
		peerLinks: PrivateLink[],
		trace?: TraceFunc,
	) {
		return new MemoryUniOriginatorState(options, peerLinks, trace);
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
