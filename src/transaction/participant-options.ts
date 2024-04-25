import { TrxRecord } from "./record";

export interface TrxParticipantOptions {
	updatePeer: (key: string, record: TrxRecord) => Promise<void>;
}
