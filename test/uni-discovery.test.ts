import { jest } from '@jest/globals';
import { describe, expect, test, it, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import { UniOriginator } from '../src/unidirectional/originator';
import { UniParticipant } from '../src/unidirectional/participant';
import { UniQuery } from '../src/unidirectional/query';
import { TestNetwork, TestNode, TestLink } from './test-network';
import { IUniOriginatorState } from '../src/unidirectional/originator-state';
import { IUniParticipantState } from '../src/unidirectional/participant-state';
import { SimpleUniOriginatorState } from '../src/unidirectional/simple-originator-state';
import { SimpleUniParticipantState } from '../src/unidirectional/simple-participant-state';
import { UniOriginatorOptions } from '../src/unidirectional/originator-options';
import { UniLink, UniSegment } from '../src/route';
import { UniParticipantOptions } from '../src/unidirectional/participant-options';

let network;
let participantStates: Record<string, IUniParticipantState>;
let participants: Record<string, UniParticipant>;
let originator: UniOriginator;

beforeEach(() => {
	// TODO: find a way to mock crypto.randomBytes so that results are deterministic

	/**
	 * @image ../doc/figures/test-network-1.png
	 */
	network = new TestNetwork(
		[
			new TestNode('N1'),
			new TestNode('N2'),
			new TestNode('N3'),
			new TestNode('N4'),
		],
		[
			new TestLink('L1', 'N1', 'N2').withTerms({ balance: 500 }),
			new TestLink('L2', 'N2', 'N3').withTerms({ balance: 500 }),
			new TestLink('L3', 'N2', 'N4').withTerms({ balance: 500 }),
		]
	);

	const originatorNode = network.find('N1');

	function getSendUni(node: TestNode) {
		return async (link: string, path: UniSegment[], query: UniQuery, hiddenReentrance?: Uint8Array) => {
			const linkNode = network.nodeLinks(node).find(l => l.name === link);
			const participant = participants[linkNode.node2];
			await new Promise(resolve => setTimeout(resolve, 10));
			const result = await participant.query(path, query, hiddenReentrance);
			await new Promise(resolve => setTimeout(resolve, 10));
			return result;
		};
	}

	const originatorState = new SimpleUniOriginatorState(
		new UniOriginatorOptions(getSendUni(originatorNode)),
		network.nodeLinks(originatorNode).map(l => ({ id: l.name, terms: l.terms } as UniLink)),
		'N3',
		{ balance: 100 }
	);

	originator = new UniOriginator(originatorState);

	participantStates = network.nodes
		.reduce((c, node) => {
			c[node.name] = new SimpleUniParticipantState(
				new UniParticipantOptions(crypto.randomBytes(32), getSendUni(node)),
				network.nodeLinks(node).map(l => ({ id: l.name, terms: l.terms } as UniLink)),
				(linkTerms, queryTerms) =>
					linkTerms['balance'] >= queryTerms['balance']
						? { balance: Math.min(linkTerms['balance'], queryTerms['balance']) }
						: undefined,
				network.nodeLinks(node).reduce((c, l) => { c[l.node2] = l.name; return c; }, {} as Record<string, string>),
				node.name
			);
			return c;
		}, {} as Record<string, IUniParticipantState>);

	participants = network.nodes
		.reduce((c, node) => {
			c[node.name] = new UniParticipant(participantStates[node.name]);
			return c;
		}, {} as Record<string, UniParticipant>);
});

describe('Simple discovery', () => {

	test('should pass the test query through the originator', async () => {
		// TODO: set random seed so that this test is deterministic
		const result = await originator.discover();

		console.log(result);
		// Assert the result
		expect(result.length).toBe(1);
		expect(result[0].length).toBe(2);

		// TODO: check results
		//expect(result[0][0].nonce).toBe();
	}, 10000);

	/* TODO: tests for:
		* Finding at different terms.balance levels
		* Not found scenarios
		* Finding at different depths
		* Finding multiple routes
		* Finding based on node identity (not known to peers)
		* Deeper and wider networks
		* Various network timing scenarios
		* Various network failures
		* Bad actor scenarios
	*/
});

