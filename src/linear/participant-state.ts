import { PhaseResponse } from "../phase";
import { LinearParticipantOptions } from "./participant-options";
import { LinearQuery } from "./query";

export interface LinearMatchResult {
    matches: LinearSegment[];
    candidates: LinearSegment[];
}

export interface LinearSegment {
    address: string;
    metadata: any;
}

export interface ILinearParticipantState {
    options: LinearParticipantOptions;
    completePhase(responses: PhaseResponse): Promise<void>;
    reportCycles(collisions: LinearSegment[]): Promise<void>;
    getMatches(query: LinearQuery): Promise<LinearMatchResult>;
}