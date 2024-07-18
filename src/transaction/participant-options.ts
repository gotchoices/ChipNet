import { TrxRecord } from "./record";

export class TrxParticipantOptions {
	constructor(
		public updatePeer: (key: string, record: TrxRecord) => Promise<void>,
	) { }
}
