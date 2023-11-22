import { LinearOriginatorOptions } from "./originator-options";
import { LinearQuery } from "./query";
import { LinearResponse } from "./response";
import { LinearRequest } from "./request";
import { PhaseResponse } from "../phase";
import { LinearLink, LinearRoute } from "../route";

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling
// TODO: make all of these async

export interface ILinearOriginatorState {
	options: LinearOriginatorOptions;
	query: LinearQuery;
    getDepth(): Promise<number>;
	startPhase(depth: number): Promise<void>;
	completePhase(responses: PhaseResponse): Promise<void>;
	getPeerLinks(): Promise<LinearLink[]>;
	getRoutes(): LinearRoute[];
	getFailures(): Record<string, string>;
	getResponse(link: string): LinearResponse | undefined;
	getOutstanding(): Record<string, LinearRequest>;
	addOutstanding(link: string, request: LinearRequest): void;
	shouldAdvance(link: string): boolean;
    getNonce(link: string): string;
}