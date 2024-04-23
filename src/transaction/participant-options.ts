import { TrxRecord } from "./record";

export interface TrxParticipantOptions {
	pushRecord: (key: string, record: TrxRecord) => Promise<void>;
}
