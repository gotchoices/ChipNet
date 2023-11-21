import { PhaseResponse } from "../phase";
import { LinearSearchResult } from "./linear-match";
import { LinearSegment } from "./linear-segment";
import { LinearParticipantOptions } from "./participant-options";
import { LinearQuery } from "./query";

export interface ILinearParticipantState {
    options: LinearParticipantOptions;
    completePhase(phaseResponse: PhaseResponse): Promise<void>;
    reportCycles(collisions: LinearSegment[]): Promise<void>;
    search(query: LinearQuery): Promise<LinearSearchResult>;
}