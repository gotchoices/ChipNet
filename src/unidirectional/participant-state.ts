import { PhaseResponse } from "../phase";
import { LinearRoute, LinearLink } from "../route";
import { Nonce } from "../types";
import { LinearParticipantOptions } from "./participant-options";
import { LinearQuery } from "./query";

export interface LinearSearchResult {
    route?: LinearRoute;
    candidates?: LinearLink[];
}

export interface ILinearParticipantState {
    options: LinearParticipantOptions;
    completePhase(phaseResponse: PhaseResponse): Promise<void>;
    reportCycles(collisions: string[]): Promise<void>;
    search(path: LinearRoute, query: LinearQuery): Promise<LinearSearchResult>;
}