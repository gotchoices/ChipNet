import { UniOriginator } from '../src/unidirectional/originator';
import { UniParticipant } from '../src/unidirectional/participant';
import { TestNetwork, TestNode } from './test-network';
import { MemoryUniOriginatorState } from '../src/unidirectional/memory-originator-state';
import { MemoryUniParticipantState } from '../src/unidirectional/memory-participant-state';
import { UniOriginatorOptions } from '../src/unidirectional/originator-options';
import { UniParticipantOptions } from '../src/unidirectional/participant-options';
import { UniParticipantState } from '../src/unidirectional/participant-state';
import { PrivateLink } from '../src/private-link';
import { QueryRequest, Intent, MemoryPeerState, PeerState, Terms } from '../src';
import { DummyAsymmetricalVault } from './dummy-asymmetrical-vault';
import { DummyCryptoHash } from './dummy-cryptohash';

export interface Timing {
	requestMs: number;
	responseMs: number;
}

export const instantTiming = { requestMs: 0, responseMs: 0 };

export class Scenario {
	public participantStates: Record<string, UniParticipantState>;
	public participants: Record<string, UniParticipant>;
	public peerStates: Record<string, PeerState> = {};
	public cryptoHash = new DummyCryptoHash(60 * 60 * 1000);

	public stats = {
		totalNetworkRequests: 0,
		networkRequestByDepth: [] as number[],
	};

	constructor(
		public network: TestNetwork,
		public timing: Timing,
	) {
		//const random = new DeterministicRandom(1234);

		// TODO: set random seed for cryptchipbase so that tests are deterministic


		this.participantStates = network.nodes
			.reduce((c, node) => {
				c[node.name] = new MemoryUniParticipantState(
					this.cryptoHash,
					(topic, message) => {
						node.log = node.log || [`${topic}: ${message}`];
					}
				);
				return c;
			}, {} as Record<string, UniParticipantState>);

		this.participants = network.nodes
			.reduce((c, node) => {
				const participantOptions = new UniParticipantOptions(
					this.makeQueryPeerFunc(node),
					true,
					(linkIntent, queryIntents) => {	// For now just filter to only lift intents and take the minimum of the requested and available balances
						const liftTerms = queryIntents['L'];
						if (!liftTerms || !linkIntent || linkIntent.code !== 'L') {
							return undefined;
						}
						const linkBalance = linkIntent.terms['balance'] as number | undefined;
						const liftBalance = liftTerms['balance'] as number | undefined;
						if (!linkBalance || !liftBalance) {
							return undefined;
						}
						const intent = { code: 'L',
							terms: Math.sign(linkBalance) === Math.sign(liftBalance) && Math.abs(linkBalance) >= Math.abs(liftBalance)
								? { balance: Math.sign(liftBalance) * Math.min(Math.abs(linkBalance), Math.abs(liftBalance)) }
								: undefined
						} as Intent;
						return intent.terms ? intent : undefined;
					}
				);
				participantOptions.maxQueryAgeMs = 60 * 60 * 1000;	// LONG TIMEOUT FOR DEBUGGING

				const asymmetricVault = new DummyAsymmetricalVault(node.name);

				c[node.name] = new UniParticipant(
					participantOptions,
					this.participantStates[node.name],
					asymmetricVault,
					this.cryptoHash,
					async () => {
						let peerState = this.peerStates[node.name];
						if (!peerState) {
							peerState = new MemoryPeerState(
								this.cryptoHash,
								network.nodeLinks(node).map(l => ({ id: l.name, intents: l.intents } as PrivateLink)),
								network.nodeLinks(node).map(l => ({ address: { key: l.node2 }, selfReferee: true, linkId: l.name })),
								{ key: node.name },
							);
							this.peerStates[node.name] = peerState;
						}
						return peerState;
					},
					(queryTerms: Terms, planTerms: Terms) =>
						Object.entries(queryTerms).every(([key, value]) => value as number <= (planTerms[key] as number))
				);
				return c;
			}, {} as Record<string, UniParticipant>);

	}

	private makeQueryPeerFunc(node: TestNode) {
		return async (request: QueryRequest, linkId: string) => {
			// Update stats
			this.stats.totalNetworkRequests++;
			// TODO: path information is no longer relayed in the request, so we need more callbacks or to put this into state
			//this.stats.networkRequestByDepth[plan.path.length] = (this.stats.networkRequestByDepth[plan.path.length] || 0) + 1;

			// Find node
			const linkNode = this.network.nodeLinks(node).find(l => l.name === linkId);

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
		};
	}

	async getOriginator(originatorName: string): Promise<UniOriginator> {
		const originatorNode = this.network.find(originatorName);
		const originatorOptions = new UniOriginatorOptions();
		const originatorState = await MemoryUniOriginatorState.build(
			originatorOptions,
			this.network.nodeLinks(originatorNode).map(l => ({ id: l.name, intents: l.intents } as PrivateLink)),
			/* TODO: trace */
		);
		const participant = this.participants[originatorName]

		return new UniOriginator(originatorState, participant, this.cryptoHash, new DummyAsymmetricalVault(originatorName));
	}
}

