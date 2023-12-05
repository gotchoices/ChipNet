import { UniOriginatorOptions } from "./originator-options";
import { UniQuery } from "./query";
import { UniResponse } from "./response";
import { UniRequest } from "./request";
import { SequenceResponse } from "../sequencing";
import { PrivateLink } from "../private-link";
import { Participant, Plan } from "../plan";

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling
// TODO: make all of these async

export interface UniOriginatorState {
	options: UniOriginatorOptions;
	query: UniQuery;
	getDepth(): Promise<number>;
	startPhase(depth: number): Promise<void>;
	completePhase(responses: SequenceResponse): Promise<void>;
	getLastTime(): Promise<number>;
	getPeerLinks(): Promise<PrivateLink[]>;
	getRoutes(): Promise<Plan[]>;
	getFailures(): Promise<Record<string, string>>;
	getResponse(link: string): Promise<UniResponse | undefined>;
	getOutstanding(): Promise<Record<string, UniRequest>>;
	addOutstanding(link: string, request: UniRequest): Promise<void>;
	shouldAdvance(link: string): Promise<boolean>;
	getNonce(link: string): string;
	getParticipant(): Promise<Participant>;
}
