import { UniOriginatorOptions } from "./originator-options";
import { UniQuery } from "./query";
import { UniResponse } from "./response";
import { UniRequest } from "./request";
import { StepResponse } from "../sequencing";
import { PrivateLink } from "../private-link";
import { Participant, Plan } from "../plan";
import { KeyPair } from "../asymmetric";

// TODO: consider using Record or Iterable when they are available in js, for immutability and scaling
// TODO: make all of these async

export interface UniOriginatorState {
	options: UniOriginatorOptions;
	query: UniQuery;
	getDepth(): Promise<number>;
	startStep(depth: number): Promise<void>;
	completeStep(responses: StepResponse): Promise<void>;
	getLastTime(): Promise<number>;
	getPeerLinks(): Promise<PrivateLink[]>;
	getPlans(): Promise<Plan[]>;
	getFailures(): Promise<Record<string, string>>;
	getResponse(link: string): Promise<UniResponse | undefined>;
	getOutstanding(): Promise<Record<string, UniRequest>>;
	addOutstanding(link: string, request: UniRequest): Promise<void>;
	shouldAdvance(link: string): Promise<boolean>;
	getNonce(link: string): string;
	getParticipant(): Promise<Participant>;
	getKeyPair(): Promise<KeyPair>;
}
