import { LinearRoute } from "./linear-route";
import { LinearOptions } from "./linear-options";
import { LinearQuery } from "./linear-query";
import { LinearResponse } from "./linear-response";
import { LinearRequest } from "./linear-request";

export interface LevelResponse {
    results: LinearResponse[]; 
    failures: Record<string, string>; 
    actualTime: number;
}

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling
// TODO: make all of these async

export interface ILinearState {
	options: LinearOptions;
	query: LinearQuery;
	startDepth(depth: number): Promise<void>;
	completeDepth(responses: LevelResponse): Promise<void>;
	getRoutes(): LinearRoute[];
	getFailures(): Record<string, string>;
	getResponse(address: string): LinearResponse | undefined;
	getOutstanding(): Record<string, LinearRequest>;
	addOutstanding(address: string, request: LinearRequest): void;
	canAdvance(address: string): boolean;
    getNonce(address: string): string;
}