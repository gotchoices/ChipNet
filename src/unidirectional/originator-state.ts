import { UniOriginatorOptions } from "./originator-options";
import { UniQuery } from "./query";

export interface UniOriginatorState {
	readonly options: UniOriginatorOptions;
	readonly query: UniQuery;
}
