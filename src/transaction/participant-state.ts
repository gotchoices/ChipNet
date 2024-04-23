import { TrxRecord } from "./record";

export interface TrxParticipantState {
	setRecord(record: TrxRecord): Promise<void>;
	getRecord(transactionCode: string): Promise<TrxRecord>;

	getPeerRecord(key: string, transactionCode: string): Promise<TrxRecord | undefined>;
	setPeerRecord(key: string, record: TrxRecord): Promise<void>;

	getOurKey(sessionCode: string): Promise<string>;

	logInvalid(record: TrxRecord, err: unknown): Promise<void>;
}
