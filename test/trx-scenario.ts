import { AsymmetricImpl, AsymmetricVaultImpl } from "chipcrypt";
import { MemoryTrxParticipantState, TrxParticipantOptions, TrxParticipant, TrxParticipantState } from "../src";
import { DummyCryptoHash } from "./dummy-cryptohash";
import { TestNetwork } from "./test-network";
import { Timing } from "./uni-scenario";
import { Asymmetric, AsymmetricVault, CryptoHash } from "chipcryptbase";
import { DummyResource } from "./dummy-resource";

export class TrxScenario {

	constructor(
		public network: TestNetwork,
		public timing: Timing,
		public vaults: Record<string, AsymmetricVault>,
		public participantStates: Record<string, TrxParticipantState>,
		public participants: Record<string, TrxParticipant>,
		public asymmetric: Asymmetric,
		public cryptoHash: CryptoHash,
	) {
		//const random = new DeterministicRandom(1234);
	}

	static async create(network: TestNetwork, timing: Timing): Promise<TrxScenario> {
		const asymmetric = new AsymmetricImpl();
		const cryptoHash = new DummyCryptoHash(60 * 60 * 1000);

		const vaults = Object.fromEntries(await Promise.all(
			network.nodes
				.map(async (node) => [
						node.name,
						new AsymmetricVaultImpl(asymmetric, await asymmetric.generateKeyPairBin())
					] as const)
		));

		const participantStates = Object.fromEntries(await Promise.all(
			network.nodes
				.map(async (node) => [
						node.name,
						new MemoryTrxParticipantState(await vaults[node.name].getPublicKeyAsString())
					] as const)
		));

		const participants = Object.fromEntries(await Promise.all(
			network.nodes
				.map(async (node) => [
						node.name,
						new TrxParticipant(
							participantStates[node.name],
							vaults[node.name],
							asymmetric,
							cryptoHash,
							new TrxParticipantOptions(
								makeUpdatePeerFunc(node, network),
							),
							new DummyResource(),
						)
					] as const)
		));

		return new TrxScenario(network, timing, vaults, participantStates, participants, asymmetric, cryptoHash);
	}

	static makeUpdatePeerFunc(node: TestNode, network: TestNetwork): (key: string, record: TrxRecord) => Promise<void> {
		return async (key, record) => {
			// Find node
			const linkNode = network.nodeLinks(node).find(l => l.name === linkId);

			// Find participant
			const participant = this.participants[linkNode!.node2];

			if (this.timing.requestMs) {
				await new Promise(resolve => setTimeout(resolve, this.timing.requestMs));
			}
			const result = await participant.query(request, linkId);
			if (this.timing.responseMs) {
				await new Promise(resolve => setTimeout(resolve, this.timing.responseMs));
			}
			return result;


			const peerNode = network.nodes.find((node) => node.name === key);
			if (!peerNode) {
				throw new Error(`Node ${node.name} could not find peer node ${key}`);
			}
			await peerNode.receiveTrxRecord(record);
		};
	}
}
