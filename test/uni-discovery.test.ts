//import { describe, expect, test, beforeEach } from '@jest/globals';
import { Intents } from '../src';
import { TestNetwork, TestNode, TestLink } from './test-network';
import { Scenario, instantTiming } from './uni-scenario';

let simpNet: TestNetwork;

beforeEach(() => {
	/**
	 * @image ../doc/cluster/figures/test-network-1.png
	 */
	simpNet = new TestNetwork(
		[
			new TestNode('N1'),
			new TestNode('N2'),
			new TestNode('N3'),
			new TestNode('N4'),
			new TestNode('N5'),
			new TestNode('N6'),
		],
		[
			new TestLink('L1', 'N1', 'N2', { 'L': { balance: 500 } as unknown } as Intents),
			new TestLink('L2', 'N2', 'N3', { 'L': { balance: 500 } as unknown } as Intents),
			new TestLink('L3', 'N2', 'N4', { 'L': { balance: 500 } as unknown } as Intents),
			new TestLink('L4', 'N4', 'N5', { 'L': { balance: 500 } as unknown } as Intents),
			new TestLink('L5', 'N3', 'N6', { 'L': { balance: 500 } as unknown } as Intents),
		]
	);

});

describe('Simple discovery', () => {

	test('should pass the test query through the originator', async () => {
		const scenario = new Scenario(simpNet, instantTiming);
		const originator = await scenario.getOriginator('N1');

		const { plans: result, sessionCode } = await originator.discover(
			{ address: { key: 'N6' } /* TODO: unsecret */ },
			{ 'L': { balance: 100 } as unknown } as Intents	// TODO: test other than lift intent
		);

		console.log(JSON.stringify(result, null, 2)); // Pretty print the result
		// Assert the result
		expect(result.length).toBe(1);
		expect(result[0].path.length).toBe(3);
		expect(result[0].path.every(p => Object.keys(p.intents).length === 1)).toBe(true);
		expect(result[0].path.every(p => p.intents['L']["balance"] === 100)).toBe(true);
		//expect((await scenario.peerStates['N1'].getPeerLinksByNonce(sessionCode))[result[0].path[0].nonce]).toBe('L1');
		const mapper = await scenario.participantStates['N1'].getNonceToLinkMap(sessionCode);
		expect(mapper).not.toBeUndefined();
		expect(mapper[result[0].path[0].nonce]).toBe('L1');
		expect(Object.keys(result[0].members).length).toBe(4);
		expect(result[0].members[0].address.key).toBe('N1');
		expect(result[0].members[3].address.key).toBe('N6');

		// TODO: check results
		//expect(result[0][0].nonce).toBe();
	}, 10000);

	test('search on large network', async () => {
		const bigNet = TestNetwork.generate(10000, 70000);
		const scenario = new Scenario(bigNet, instantTiming);
		const originator = await scenario.getOriginator(bigNet.nodes[0].name);

		const { plans } = await originator.discover(
			{ address: { key: bigNet.nodes[bigNet.nodes.length - 1].name } },
			{ 'L': { balance: 1 } as unknown } as Intents
		);

		console.log(JSON.stringify(plans, null, 2)); // Pretty print the result
		console.log(JSON.stringify(scenario.stats));

		// bigNet.nodes.filter(n => n.log).forEach(n => {
		// 	console.log(`Node ${n.name}:`);
		// 	n.log!.forEach(l => console.log(`  ${l}`));
		// });
	}, 100000);

	/* TODO: tests for:
		* Finding at different terms.balance levels
		* Multiple simultaneous queries/sessions
		* Not found scenarios
		* Finding at different depths
		* Finding multiple routes
		* Finding based on node identity (not known to peers)
		* Finding comms and mixed intents
		* Deeper and wider networks
		* Various network timing scenarios
		* Various network failures
		* Bad actor scenarios
	*/
});

