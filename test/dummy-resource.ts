/* eslint-disable @typescript-eslint/no-unused-vars */
import { Member, TrxLink, TrxParticipantResource, TrxRecord } from "../src";

export class DummyResource implements TrxParticipantResource {
	_states: Record<string, '' | 'promised' | 'committed' | 'reverted'> = {};

	async shouldPromise(member: Member, links: TrxLink[], record: TrxRecord): Promise<boolean> {
		return true; // For now, always agree to promise
	}

	async promise(member: Member, links: TrxLink[], record: TrxRecord): Promise<void> {
		if (this._states[record.transactionCode] !== '') {
			throw new Error(`Cannot promise member ${member.key} for transaction ${record.transactionCode} because it is already in state ${this._states[record.transactionCode]}`);
		}
		this._states[record.transactionCode] = 'promised';
	}

	async isHeld(member: Member, links: TrxLink[], record: TrxRecord): Promise<boolean> {
		// Implement your logic here
		// This method should perform some asynchronous operation and return a boolean value indicating if the resource is held
		return this._states[record.transactionCode] === 'promised';
	}

	async shouldCommit(member: Member, links: TrxLink[], record: TrxRecord): Promise<boolean> {
		return true; // For now, always agree to commit
	}

	async release(isSuccess: boolean, member: Member, links: TrxLink[], record: TrxRecord): Promise<void> {
		if (this._states[record.transactionCode] !== 'promised') {
			throw new Error(`Cannot release member ${member.key} for transaction ${record.transactionCode} because it is not in state 'promised'`);
		}
		this._states[record.transactionCode] = isSuccess ? 'committed' : 'reverted';
	}
}
