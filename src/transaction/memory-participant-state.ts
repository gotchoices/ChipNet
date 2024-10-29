import { TrxParticipantState } from "./participant-state";
import { TrxRecord } from "./record";
import { Address, IdentifiedMember } from "..";

export class MemoryTrxParticipantState implements TrxParticipantState {
	constructor (
		public readonly self: IdentifiedMember,
		public readonly recordSaved?: (record: TrxRecord) => void,
		public readonly tryLoadRecord?: (transactionCode: string) => Promise<TrxRecord | undefined>,
	) {
	}

	private records: Map<string, TrxRecord> = new Map();
	private peerRecords: Map<string, Map<string, TrxRecord>> = new Map();
	private releasedTransactions: Set<string> = new Set();

	async saveRecord(record: TrxRecord): Promise<void> {
		this.records.set(record.transactionCode, record);
		this.recordSaved?.(record);
	}

	async getRecord(transactionCode: string): Promise<TrxRecord | undefined> {
		let result = this.records.get(transactionCode);
		if (!result && this.tryLoadRecord) {
			result = await this.tryLoadRecord(transactionCode);
			if (result) {
				this.records.set(transactionCode, result);
			}
		}
		return result;
	}

	async getPeerRecord(address: Address, transactionCode: string): Promise<TrxRecord | undefined> {
		return this.peerRecords.get(JSON.stringify(address))?.get(transactionCode);
	}

	async savePeerRecord(address: Address, record: TrxRecord): Promise<void> {
		const addressKey = JSON.stringify(address);
		const peer = this.peerRecords.get(addressKey);
		if (peer) {
			peer.set(record.transactionCode, record);
		} else {
			this.peerRecords.set(addressKey, new Map([[record.transactionCode, record]]));
		}
	}

	async setIsReleased(transactionCode: string): Promise<void> {
		this.releasedTransactions.add(transactionCode);
	}

	async getIsReleased(transactionCode: string): Promise<boolean> {
		return this.releasedTransactions.has(transactionCode);
	}

	async logReleaseError(record: TrxRecord, err: unknown): Promise<void> {
		console.error(`Error releasing transaction (${err}): ${JSON.stringify(record)}`);
	}

	async logInvalid(record: TrxRecord, err: unknown): Promise<void> {
		console.error(`Invalid record (${err}): ${JSON.stringify(record)}`);
	}

  async logUpdateError(record: TrxRecord, address: Address, err: unknown): Promise<void> {
    console.error(`Error sending update to peer ${JSON.stringify(address)} (${err instanceof Error ? err.message : err})`);
  }
}
