import { TrxParticipantState } from "./participant-state";
import { AsymmetricVault } from "chipcryptbase";
import { TrxRecord } from "./record";

export class MemoryTrxParticipantState implements TrxParticipantState {
	constructor (
		public readonly publicKey: string,
	) {
	}

	private records: Map<string, TrxRecord> = new Map();
	private peerRecords: Map<string, Map<string, TrxRecord>> = new Map();

	async setRecord(record: TrxRecord): Promise<void> {
		this.records.set(record.transactionCode, record);
	}

	async getRecord(transactionCode: string): Promise<TrxRecord> {
		const record = this.records.get(transactionCode);
		if (record) {
			return record;
		} else {
			throw new Error("Record not found.");
		}
	}

	async getPeerRecord(key: string, transactionCode: string): Promise<TrxRecord | undefined> {
		return this.peerRecords.get(key)?.get(transactionCode);
	}

	async setPeerRecord(key: string, record: TrxRecord): Promise<void> {
		const peer = this.peerRecords.get(key);
		if (peer) {
			peer.set(record.transactionCode, record);
		} else {
			this.peerRecords.set(key, new Map([[record.transactionCode, record]]));
		}
	}

	async logInvalid(record: TrxRecord, err: unknown): Promise<void> {
		console.error(`Invalid record (${err}): ${JSON.stringify(record)}`);
	}
}
