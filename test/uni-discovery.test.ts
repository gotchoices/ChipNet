//import { describe, expect, test, beforeEach } from '@jest/globals';
import { TestNetwork, TestNode, TestLink } from './test-network';
import { Scenario, instantTiming } from './uni-scenario';

let simpNet: TestNetwork;

beforeEach(() => {
	/**
	 * @image ../doc/figures/test-network-1.png
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
			new TestLink('L1', 'N1', 'N2', [{ code: 'L', version: 1, terms: { balance: 500 } }]),
			new TestLink('L2', 'N2', 'N3', [{ code: 'L', version: 1, terms: { balance: 500 } }]),
			new TestLink('L3', 'N2', 'N4', [{ code: 'L', version: 1, terms: { balance: 500 } }]),
			new TestLink('L4', 'N4', 'N5', [{ code: 'L', version: 1, terms: { balance: 500 } }]),
			new TestLink('L5', 'N3', 'N6', [{ code: 'L', version: 1, terms: { balance: 500 } }]),
		]
	);

});

describe('Simple discovery', () => {

	test('should pass the test query through the originator', async () => {
		const scenario = new Scenario(simpNet, instantTiming);
		const originator = await scenario.getOriginator('N1', { key: 'N6' });

		const result = await originator.discover();

		console.log(JSON.stringify(result, null, 2)); // Pretty print the result
		// Assert the result
		expect(result.length).toBe(1);
		expect(result[0].path.length).toBe(3);
		expect(result[0].path.every(p => p.intents.length === 1)).toBe(true);
		expect(result[0].path.every(p => p.intents[0].terms["balance"] === 100)).toBe(true);
		expect(Object.keys(result[0].members).length).toBe(4);
		expect(result[0].participants[0]).toBe('<N1>');
		expect(result[0].participants[3]).toBe('N6');

		// TODO: check results
		//expect(result[0][0].nonce).toBe();
	}, 10000);

	test('stats on large networks', async () => {
		const bigNet = TestNetwork.generate(10000, 70000);
		const scenario = new Scenario(bigNet, instantTiming);
		const originator = await scenario.getOriginator(
			bigNet.nodes[0].name,
			{ key: bigNet.nodes[bigNet.nodes.length - 1].name });

		const result = await originator.discover();

		console.log(JSON.stringify(result, null, 2)); // Pretty print the result
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

