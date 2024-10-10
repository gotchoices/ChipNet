import { TrxParticipantState } from "./participant-state";
import { TrxRecord } from "./record";
import { Address, IdentifiedMember } from "..";

export class MemoryTrxParticipantState implements TrxParticipantState {
	constructor (
		public readonly self: IdentifiedMember,
	) {
	}

	private records: Map<string, TrxRecord> = new Map();
	private peerRecords: Map<string, Map<string, TrxRecord>> = new Map();

	async setRecord(record: TrxRecord): Promise<void> {
		this.records.set(record.transactionCode, record);
	}

	async getRecord(transactionCode: string): Promise<TrxRecord | undefined> {
		return this.records.get(transactionCode);
	}

	async getPeerRecord(address: Address, transactionCode: string): Promise<TrxRecord | undefined> {
		return this.peerRecords.get(JSON.stringify(address))?.get(transactionCode);
	}

	async setPeerRecord(address: Address, record: TrxRecord): Promise<void> {
		const addressKey = JSON.stringify(address);
		const peer = this.peerRecords.get(addressKey);
		if (peer) {
			peer.set(record.transactionCode, record);
		} else {
			this.peerRecords.set(addressKey, new Map([[record.transactionCode, record]]));
		}
	}

	async logInvalid(record: TrxRecord, err: unknown): Promise<void> {
		console.error(`Invalid record (${err}): ${JSON.stringify(record)}`);
	}

  async logUpdateError(record: TrxRecord, address: Address, err: unknown): Promise<void> {
    console.error(`Error sending update to peer ${JSON.stringify(address)} (${err instanceof Error ? err.message : err})`);
  }
}
