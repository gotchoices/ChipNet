import { PhaseResponse } from "../phase";
import { UniRoute, UniLink } from "../route";
import { Nonce } from "../types";
import { UniParticipantOptions } from "./participant-options";
import { UniQuery } from "./query";

export interface UniSearchResult {
    route?: UniRoute;
    candidates?: UniLink[];
}

export interface IUniParticipantState {
    options: UniParticipantOptions;
    completePhase(phaseResponse: PhaseResponse): Promise<void>;
    reportCycles(collisions: string[]): Promise<void>;
    search(path: UniRoute, query: UniQuery): Promise<UniSearchResult>;
}