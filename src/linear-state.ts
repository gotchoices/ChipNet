import { LinearRoute } from "./linear-route";
import { LinearOptions } from "./linear-options";
import { LinearQuery } from "./linear-query";
import { LinearResponse } from "./linear-response";
import { LinearRequest } from "./linear-request";

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling

export interface ILinearState {
	options: LinearOptions;
	query: LinearQuery;
	getRoutes(): LinearRoute[];
	getFailures(): Record<string, string>;
	addFailure(address: string, error: string): void;
	getResponse(address: string): LinearResponse | undefined;
	addResponse(address: string, response: LinearResponse): void;
	getOutstanding(): Record<string, LinearRequest>;
	addOutstanding(address: string, request: LinearRequest): void;
	canAdvance(address: string): boolean;
    getNonce(address: string): string;
}