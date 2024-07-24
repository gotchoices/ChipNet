import { Intents, processIntents } from '../src';
import { Terms } from '../src/types';

export class TestNetwork {
	// Set of nodes and links between them
	nodes: TestNode[];
	links: TestLink[];

	private _linksByNode: Record<string, TestLink[]>;
	private _nodesByName: Record<string, TestNode>;

	constructor(nodes: TestNode[], links: TestLink[]) {
		this.nodes = nodes;
		this.links = links;

		this._linksByNode = {};
		this._nodesByName = {};

		this.nodes.forEach(node => {
			this._nodesByName[node.name] = node;
			this._linksByNode[node.name] = [];
		});

		this.links.forEach(link => {
			this._linksByNode[link.node1].push(link);
			this._linksByNode[link.node2].push(link);
		});
	}

	static generate(nodeCount: number, linkCount: number) {
		const nodes: TestNode[] = [];
		const links: TestLink[] = [];

		for (let i = 0; i < nodeCount; i++) {
			const node = new TestNode(`N${i}`);
			nodes.push(node);
		}

		for (let i = 0; i < linkCount; i++) {
			const node1Index = Math.floor(Math.random() * nodeCount);
			const node2Index = Math.floor(Math.random() * nodeCount);
			const node1 = nodes[node1Index];
			const node2 = nodes[node2Index];
			const link = new TestLink(`L${i}`, node1.name, node2.name, { 'L': { balance: Math.random() * 1000 - 500 } as Terms } as Intents);
			links.push(link);
		}

		return new TestNetwork(nodes, links);
	}

	nodeLinks(node: TestNode) {
		const links = this._linksByNode[node.name];
		return links.map(link => link.node1 === node.name ? link : link.invertedLink());
	}

	find(nodeName: string) {
		return this._nodesByName[nodeName];
	}
}

export class TestNode {
	name: string;
	log?: string[];

	constructor(name: string) {
		this.name = name;
	}
}

export class TestLink {
	constructor(
		public name: string,
		public node1: string,
		public node2: string,
		public intents: Intents) {
	}

	invertedLink() {
		const link = new TestLink(this.name, this.node2, this.node1, processIntents(this.intents, intents =>
			intents.map(intent => ({ ...intent, terms: invertedTerms(intent.terms) }))));
		return link;
	}

	toString() {
		return `${this.node1} --${this.name}--> ${this.node2}`;
	}
}

function invertedTerms(terms: Terms) {
	return Object.entries(terms).reduce((acc, [key, value]) => {
		acc[key] = typeof value === 'number' ? -value : value;
		return acc;
	}, {} as Terms);
}
