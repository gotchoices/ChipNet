import { TrxParticipantState } from "./participant-state";
import { TrxRecord } from "./record";

export class TrxParticipant {
	constructor(
		public state: TrxParticipantState,
	) {}

	public async update(link: string, record: TrxRecord): Promise<void> {
		//await this.state.update(link, record)
	}
}
