import { UniOriginatorState } from "./originator-state";
import { Plan } from "../plan";
import { QueryRequest, UniParticipant, UniParticipantState } from "..";

export class UniOriginator {
	private _participant: UniParticipant;

	constructor(
		private state: UniOriginatorState,
		participantState: UniParticipantState,
	) {
		this._participant = new UniParticipant(participantState);
	}

	async discover(): Promise<Plan[]> {
		let request = { first: { plan: { path: [], participants: [] }, query: this.state.query } } as QueryRequest;
		for (let i = 0; i <= this.state.options.maxDepth; i++) {
			const response = await this._participant.query(request);
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
