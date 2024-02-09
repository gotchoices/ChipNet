import { UniOriginator } from '../src/unidirectional/originator';
import { UniParticipant } from '../src/unidirectional/participant';
import { TestNetwork, TestNode } from './test-network';
import { MemoryUniOriginatorState } from '../src/unidirectional/memory-originator-state';
import { MemoryUniParticipantState } from '../src/unidirectional/memory-participant-state';
import { UniOriginatorOptions } from '../src/unidirectional/originator-options';
import { UniParticipantOptions } from '../src/unidirectional/participant-options';
import { UniParticipantState } from '../src/unidirectional/participant-state';
import { PrivateLink } from '../src/private-link';
import { AsymmetricImpl, AsymmetricVaultImpl } from 'chipcrypt';
import { AsymmetricVault } from 'chipcryptbase';
import { Address } from '../src/target';
import { QueryRequest } from '../src';

export interface Timing {
	requestMs: number;
	responseMs: number;
}

export const instantTiming = { requestMs: 0, responseMs: 0 };

export class Scenario {
	public participantStates: Record<string, UniParticipantState>;
	public participants: Record<string, UniParticipant>;

	public stats = {
		totalNetworkRequests: 0,
		networkRequeuestByDepth: [] as number[],
	};

	static async generate(network: TestNetwork, timing: Timing) {
		const asymmetric = await AsymmetricVaultImpl.generate(new AsymmetricImpl());
		return new Scenario(network, timing, asymmetric);
	}

	constructor(
		public network: TestNetwork,
		public timing: Timing,
		public asymmetric: AsymmetricVault,
	) {
		//const random = new DeterministicRandom(1234);

		// TODO: set random seed for cryptchipbase so that tests are deterministic

		this.participantStates = network.nodes
			.reduce((c, node) => {
				const participantOptions = new UniParticipantOptions(this.makeQueryPeerFunc(node), true, []);
				participantOptions.stepOptions.maxTimeMs = 100000;	// LONG TIMEOUT FOR DEBUGGING
				c[node.name] = new MemoryUniParticipantState(
					participantOptions,
					network.nodeLinks(node).map(l => ({ id: l.name, terms: l.terms } as PrivateLink)),
					(linkTerms, queryTerms) =>
						linkTerms['balance'] >= queryTerms['balance']
							? { balance: Math.min(linkTerms['balance'], queryTerms['balance']) }
							: undefined,
					this.asymmetric,
					network.nodeLinks(node).map(l => ({ address: { key: l.node2 }, selfReferee: true, linkId: l.name })),
					{ key: node.name }
				);
				return c;
			}, {} as Record<string, UniParticipantState>);

		this.participants = network.nodes
			.reduce((c, node) => {
				c[node.name] = new UniParticipant(this.participantStates[node.name]);
				return c;
			}, {} as Record<string, UniParticipant>);

	}

	private makeQueryPeerFunc(node: TestNode) {
		return async (request: QueryRequest, linkId: string) => {
			// Update stats
			this.stats.totalNetworkRequests++;
			// TODO: path information is no longer relayed in the request, so we need more callbacks or to put this into state
			//this.stats.networkRequeuestByDepth[plan.path.length] = (this.stats.networkRequeuestByDepth[plan.path.length] || 0) + 1;

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

	async getOriginator(originatorName: string, target: Address): Promise<UniOriginator> {
		const originatorNode = this.network.find(originatorName);
		const originatorOptions = new UniOriginatorOptions(this.makeQueryPeerFunc(originatorNode), true);
		originatorOptions.stepOptions.maxTimeMs = 100000;	// LONG TIMEOUT FOR DEBUGGING
		const originatorState = await MemoryUniOriginatorState.build(
			originatorOptions,
			this.network.nodeLinks(originatorNode).map(l => ({ id: l.name, terms: l.terms } as PrivateLink)),
			this.asymmetric,
			{ address: target /* TODO: unsecret */ },
			{ balance: 100 }
		);
		const participant = this.participants[originatorName]

		return new UniOriginator(originatorState, participant.state);
	}
}

