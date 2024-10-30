import { TrxRecord } from ".";
import { Address, IdentifiedMember } from "..";

export interface TrxParticipantState {
	self: IdentifiedMember;

	saveRecord(record: TrxRecord): Promise<void>;
	getRecord(record: TrxRecord): Promise<TrxRecord | undefined>;

	getPeerRecord(address: Address, transactionCode: string): Promise<TrxRecord | undefined>;
	savePeerRecord(address: Address, record: TrxRecord): Promise<void>;

	setIsReleased(transactionCode: string): Promise<void>;
	getIsReleased(transactionCode: string): Promise<boolean>;

	logInvalid(record: TrxRecord, err: unknown): Promise<void>;
	logUpdateError(record: TrxRecord, address: Address, err: unknown): Promise<void>;
	logReleaseError(record: TrxRecord, err: unknown): Promise<void>;
}
