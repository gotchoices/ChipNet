// Jest test for TrxParticipant
/*
class TrxParticipant {
	constructor(
		public state: TrxParticipantState,
		public vault: AsymmetricVault,
		public asymmetric: Asymmetric,
		public cryptoHash: CryptoHash,
		public options: TrxParticipantOptions,
		public resource: TrxParticipantResource,
	) { }

	public async update(record: TrxRecord, fromKey?: string): Promise<void> {
*/

import { CodeOptions } from "chipcode";
import { MemoryTrxParticipantState, TrxParticipant, TrxRecord } from "../src";
import { DummyAsymmetricalVault } from "./dummy-asymmetrical-vault";
import { DummyCryptoHash } from "./dummy-cryptohash";
import { AsymmetricImpl } from "chipcrypt";

describe('TrxParticipant', () => {
	test('initial update with us as first promise signatory', async () => {
		const vault = new DummyAsymmetricalVault('A1');
		const state = new MemoryTrxParticipantState(await vault.getPublicKeyAsString());
		const asymmetric = new AsymmetricImpl();
		const cryptoHash = new DummyCryptoHash(60 * 60 * 1000);
		const options = {
			updatePeer: async (key: string, record: TrxRecord) => {
				const peerRecord = await state.getPeerRecord(key, record.transactionCode);
				if (peerRecord) {
					await state.setPeerRecord(key, record);
				}
			},
		};
		// const resource = {
		// 	shouldPromise: async (record: TrxRecord) => {
		// 		return true;
		// 	},
		// 	promise: async (member: Member, links: { nonce: Nonce; link: Link; }[], record: TrxRecord) => {
		// 		await state.setRecord(record);
		// 	},
		// 	isHeld: async (merged: TrxRecord) => {
		// 		return true;
		// 	},
		// 	shouldCommit: async (record: TrxRecord) => {
		// 		return true;
		// 	},
		// 	release: async (isSuccess: boolean, member: Member, links: { nonce: Nonce; link: Link; }[], record: TrxRecord) => {
		// 		await state.setRecord(record);
		// 	},
		// };
		// const participant = new TrxParticipant(state, vault, asymmetric, cryptoHash, options, resource);
		// const record = new TrxRecord();
		// record.transactionCode = '123';
		// record.signatories = [await vault.getPublicKeyAsString()];
		// record.links = [];
		// record.nonce = '123';
		// record.data = '123';
		// record.signature = await asymmetric.sign(await cryptoHash.hash(record.data), await vault.getPrivateKey());
		// // Act
		// await participant.update(record);
		// // Assert
		// const updatedRecord = await state.getRecord(record.transactionCode);
		// expect(updatedRecord).toEqual(record);
	});
});
