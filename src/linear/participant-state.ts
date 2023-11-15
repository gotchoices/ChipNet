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
    reportCycles(collisions: LinearSegment[]): Promise<void>;
    getMatches(query: LinearQuery): Promise<LinearMatchResult>;
    options: LinearParticipantOptions;
}