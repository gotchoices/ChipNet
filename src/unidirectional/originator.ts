import { UniOriginatorState } from "./originator-state";
import { Plan } from "../plan";
import { QueryRequest, UniParticipant } from "..";

export class UniOriginator {

	constructor(
		private state: UniOriginatorState,
		private participant: UniParticipant,
	) {
	}

	async discover(): Promise<Plan[]> {
		let request = { first: { plan: { path: [], participants: [], members: {} }, query: this.state.query } } as QueryRequest;
		for (let i = 0; i <= this.state.options.maxDepth; i++) {
			const response = await this.participant.query(request);
			if (!response.plans?.length) {
				if (!response.canReenter) {
					break;
				}
				request = { reentrance: { sessionCode: this.state.query.sessionCode } };
			} else {
				return response.plans;
			}
		}
		return [];
	}
}
