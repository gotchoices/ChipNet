export class DeterministicRandom {
	private a = 1664525;
	private c = 1013904223;
	private m = Math.pow(2, 32);

	constructor(public seed: number) {
			this.seed = seed;
	}

	public next(): number {
			this.seed = (this.a * this.seed + this.c) % this.m;
			return this.seed;
	}

	public getKey(): Uint8Array {
			const key = new Uint8Array(32);
			for (let i = 0; i < 32; i++) {
					key[i] = this.next() % 256;
			}
			return key;
	}
}
