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
		let request = { first: { plan: { path: [], participants: [] }, query: this.state.query } } as QueryRequest;
		for (let i = 0; i <= this.state.options.maxDepth; i++) {
			const response = await this.participant.query(request);
			if (!response.plans?.length) {
				if (!response.ticket) {
					break;
				}
				request = { ticket: response.ticket };
			} else {
				return response.plans;
			}
		}
		return [];
	}
}
