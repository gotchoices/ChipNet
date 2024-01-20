import { UniOriginator } from '../src/unidirectional/originator';
import { UniParticipant } from '../src/unidirectional/participant';
import { type UniQuery } from '../src/unidirectional/query';
import { TestNetwork, TestNode, TestLink } from './test-network';
import { MemoryUniOriginatorState } from '../src/unidirectional/memory-originator-state';
import { MemoryUniParticipantState } from '../src/unidirectional/memory-participant-state';
import { UniOriginatorOptions } from '../src/unidirectional/originator-options';
import { UniParticipantOptions } from '../src/unidirectional/participant-options';
import { Plan } from '../src/plan';
import { UniParticipantState } from '../src/unidirectional/participant-state';
import { PrivateLink } from '../src/private-link';
import { AsymmetricImpl, SymmetricImpl } from 'chipcrypt';
import { DeterministicRandom } from './deterministic-random';
import { Asymmetric } from 'chipcryptbase';
import { Address } from '../src/target';

export interface Timing {
	requestMs: number;
	responseMs: number;
}

export const instantTiming = { requestMs: 0, responseMs: 0 };

export class Scenario {
	public participantStates: Record<string, UniParticipantState>;
	public participants: Record<string, UniParticipant>;
	public asymmetric: Asymmetric;

	public stats = {
		totalNetworkRequests: 0,
		networkRequeuestByDepth: [] as number[],
	};

	constructor(
		public network: TestNetwork,
		public timing: Timing
	) {
		const random = new DeterministicRandom(1234);
		// TODO: set random seed for cryptchipbase so that tests are deterministic

		this.asymmetric = new AsymmetricImpl();

		this.participantStates = network.nodes
			.reduce((c, node) => {
				const participantOptions = new UniParticipantOptions(random.getKey(), this.getSendUni(node), true, []);
				participantOptions.stepOptions.maxTime = 100000;	// LONG TIMEOUT FOR DEBUGGING
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
		const symmetric = new SymmetricImpl();

		this.participants = network.nodes
			.reduce((c, node) => {
				c[node.name] = new UniParticipant(this.participantStates[node.name], symmetric);
				return c;
			}, {} as Record<string, UniParticipant>);

	}

	private getSendUni(node: TestNode) {
		return async (link: string, plan: Plan, query: UniQuery, hiddenReentrance?: Uint8Array) => {
			// Update stats
			this.stats.totalNetworkRequests++;
			this.stats.networkRequeuestByDepth[plan.path.length] = (this.stats.networkRequeuestByDepth[plan.path.length] || 0) + 1;

			// Find node
			const linkNode = this.network.nodeLinks(node).find(l => l.name === link);

			// Find participant
			const participant = this.participants[linkNode!.node2];

			if (this.timing.requestMs) {
				await new Promise(resolve => setTimeout(resolve, this.timing.requestMs));
			}
			const result = await participant.query(plan, query, hiddenReentrance);
			if (this.timing.responseMs) {
				await new Promise(resolve => setTimeout(resolve, this.timing.responseMs));
			}
			return result;
		};
	}

	getOriginator(originatorName: string, target: Address): UniOriginator {
		const originatorNode = this.network.find(originatorName);
		const originatorOptions = new UniOriginatorOptions(this.getSendUni(originatorNode), true);
		originatorOptions.stepOptions.maxTime = 100000;	// LONG TIMEOUT FOR DEBUGGING
		const originatorState = new MemoryUniOriginatorState(
			originatorOptions,
			this.network.nodeLinks(originatorNode).map(l => ({ id: l.name, terms: l.terms } as PrivateLink)),
			{ address: target /* TODO: unsecret */ },
			{ balance: 100 },
			this.asymmetric
		);

		return new UniOriginator(originatorState);
	}
}

