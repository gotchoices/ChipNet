import { Intent, PrivateLink, Terms, QueryRequest } from "../src";
import { UniParticipantState, UniParticipant, MemoryUniParticipantState, UniParticipantOptions, UniQuery, UniOriginator, UniOriginatorOptions, MemoryUniOriginatorState } from "../src/unidirectional";
import { DummyAsymmetricalVault } from "./dummy-asymmetrical-vault";
import { DummyCryptoHash } from "./dummy-cryptohash";
import { TestNetwork, TestNode } from "./test-network";

export interface Timing {
	requestMs: number;
	responseMs: number;
}

export const instantTiming = { requestMs: 0, responseMs: 0 };

export class Scenario {
	public participantStates: Record<string, UniParticipantState>;
	public participants: Record<string, UniParticipant>;
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
					async (query: UniQuery) => {	// findAddress
						return {
							self: {
								member: {
									address: { key: node.name },
									types: ['P'],
								}},
							selfIsMatch: query.target.address.key === node.name,
							peerMatch: network.nodeLinks(node)
								.filter(l => l.node2 === query.target.address.key)
								.map(l => ({
									match: {
										member: {
											address: { key: l.node2 },
											types: ['P'],
										},
									},
									link: { id: l.name, intents: l.intents },
								})),
							candidates: network.nodeLinks(node).map(l => ({ id: l.name, intents: l.intents } as PrivateLink)),
						};
					},
					(queryTerms: Terms, planTerms: Terms) =>	// IntentsSatisfiedFunc
						Object.entries(queryTerms).every(([key, value]) => value as number <= (planTerms[key] as number)),
					this.makeQueryPeerFunc(node),
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

