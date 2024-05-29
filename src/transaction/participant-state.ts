import { TrxRecord } from "./record";

export interface TrxParticipantState {
	publicKey: string;

	setRecord(record: TrxRecord): Promise<void>;
	getRecord(transactionCode: string): Promise<TrxRecord>;

	getPeerRecord(key: string, transactionCode: string): Promise<TrxRecord | undefined>;
	setPeerRecord(key: string, record: TrxRecord): Promise<void>;

	logInvalid(record: TrxRecord, err: unknown): Promise<void>;
}
