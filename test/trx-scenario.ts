import { MemoryTrxParticipantState, PrivateLink, TrxParticipant, TrxParticipantState } from "../src";
import { DummyCryptoHash } from "./dummy-cryptohash";
import { TestNetwork } from "./test-network";
import { Timing } from "./uni-scenario";

export class TrxScenario {
	public participantStates: Record<string, TrxParticipantState>;
	public participants: Record<string, TrxParticipant>;
	public cryptoHash = new DummyCryptoHash(60 * 60 * 1000);

	constructor(
		public network: TestNetwork,
		public timing: Timing,
	) {
		//const random = new DeterministicRandom(1234);

		this.participantStates = network.nodes
			.reduce((c, node) => {
				c[node.name] = new MemoryTrxParticipantState(
					this.cryptoHash,
					network.nodeLinks(node).map(l => ({ id: l.name, intents: l.intents } as PrivateLink)),
					network.nodeLinks(node).map(l => ({ address: { key: l.node2 }, selfReferee: true, linkId: l.name })),
					{ key: node.name },
					(topic, message) => {
						node.log = node.log || [`${topic}: ${message}`];
					}
				);
				return c;
			}, {} as Record<string, TrxParticipantState>);
}
