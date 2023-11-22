import { UniOriginatorOptions } from "./originator-options";
import { UniQuery } from "./query";
import { UniResponse } from "./response";
import { UniRequest } from "./request";
import { PhaseResponse } from "../phase";
import { UniLink, UniRoute } from "../route";

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling
// TODO: make all of these async

export interface IUniOriginatorState {
	options: UniOriginatorOptions;
	query: UniQuery;
    getDepth(): Promise<number>;
	startPhase(depth: number): Promise<void>;
	completePhase(responses: PhaseResponse): Promise<void>;
	getPeerLinks(): Promise<UniLink[]>;
	getRoutes(): UniRoute[];
	getFailures(): Record<string, string>;
	getResponse(link: string): UniResponse | undefined;
	getOutstanding(): Record<string, UniRequest>;
	addOutstanding(link: string, request: UniRequest): void;
	shouldAdvance(link: string): boolean;
    getNonce(link: string): string;
}