import { StepResponse } from "../sequencing";
import { Plan } from "../plan";
import { PrivateLink } from "../private-link";
import { Nonce } from "../types";
import { UniParticipantOptions } from "./participant-options";
import { UniQuery } from "./query";
import { KeyPair } from "../asymmetric";

export interface UniSearchResult {
	route?: Plan;
	candidates?: PrivateLink[];
}

export interface UniParticipantState {
	options: UniParticipantOptions;
	completeStep(phaseResponse: StepResponse): Promise<void>;
	reportCycles(collisions: string[]): Promise<void>;
	search(plan: Plan, query: UniQuery): Promise<UniSearchResult>;
	negotiatePlan(p: Plan): Promise<Plan>;
	getKeyPair(): Promise<KeyPair>;
}
