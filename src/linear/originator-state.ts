import { LinearRoute } from "./route";
import { LinearOriginatorOptions } from "./originator-options";
import { LinearQuery } from "./query";
import { LinearResponse } from "./response";
import { LinearRequest } from "./request";
import { PhaseResponse } from "../phase";

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling
// TODO: make all of these async

export interface ILinearOriginatorState {
	options: LinearOriginatorOptions;
	query: LinearQuery;
    getDepth(): Promise<number>;
	startPhase(depth: number): Promise<void>;
	completePhase(responses: PhaseResponse): Promise<void>;
	getRoutes(): LinearRoute[];
	getFailures(): Record<string, string>;
	getResponse(address: string): LinearResponse | undefined;
	getOutstanding(): Record<string, LinearRequest>;
	addOutstanding(address: string, request: LinearRequest): void;
	canAdvance(address: string): boolean;
    getNonce(address: string): string;
}