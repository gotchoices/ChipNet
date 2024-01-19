import { StepResponse } from "../sequencing";
import { Plan } from "../plan";
import { PrivateLink } from "../private-link";
import { Nonce, Terms } from "../types";
import { UniParticipantOptions } from "./participant-options";
import { UniQuery } from "./query";
import { KeyPairBin } from "chipcryptbase";

export interface UniSearchResult {
	route?: Plan;
	candidates?: PrivateLink[];
}

export interface UniParticipantState {
	options: UniParticipantOptions;
	completeStep(phaseResponse: StepResponse): Promise<void>;
	reportCycles(query: UniQuery, path: string[], collisions: string[]): Promise<void>;
	search(plan: Plan, query: UniQuery): Promise<UniSearchResult>;
	negotiatePlan(p: Plan): Promise<Plan>;
	negotiateTerms(linkTerms: Terms, queryTerms: Terms): Promise<Terms | undefined>;
	getKeyPair(): Promise<KeyPairBin>;
}
