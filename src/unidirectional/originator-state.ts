import { TraceFunc } from "../trace";
import { UniOriginatorOptions } from "./originator-options";


export interface UniOriginatorState {
	/** The time budget growth-rate from historical experience */
	getLearnedGrowth(): Promise<number | undefined>;
	/** Record the time budget growth-rate from the last sequence */
	recordGrowth(growth: number): void;
	readonly options: UniOriginatorOptions;

	trace?: TraceFunc;
}
