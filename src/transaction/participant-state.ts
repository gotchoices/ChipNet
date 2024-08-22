import { TrxRecord } from ".";
import { Address, IdentifiedMember } from "..";

export interface TrxParticipantState {
	self: IdentifiedMember;

	setRecord(record: TrxRecord): Promise<void>;
	getRecord(transactionCode: string): Promise<TrxRecord>;

	getPeerRecord(address: Address, transactionCode: string): Promise<TrxRecord | undefined>;
	setPeerRecord(address: Address, record: TrxRecord): Promise<void>;

	logInvalid(record: TrxRecord, err: unknown): Promise<void>;
}
