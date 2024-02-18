/* eslint-disable @typescript-eslint/no-unused-vars */
import { CryptoHash } from 'chipcryptbase';

export class DummyCryptoHash implements CryptoHash {
	private _sequence = 0;

	constructor(
		public readonly ageMs: number,
		private readonly id = 0,
	) { }

	isValid(code: string, now = Date.now()): boolean {
		const { id, exp } = JSON.parse(code);
		return (id ?? 0) === this.id && exp > now;
	}

	isValidBin(codeBin: Uint8Array, now?: number | undefined): boolean {
		throw new Error('Method not implemented.');
	}

	getExpiration(code: string): number {
		const { exp } = JSON.parse(code);
		return exp;
	}

	getExpirationBin(codeBin: Uint8Array): number {
		throw new Error('Method not implemented.');
	}

	isExpired(code: string, now = Date.now()): boolean {
		const { exp } = JSON.parse(code);
		return exp < now;
	}

	isExpiredBin(codeBytes: Uint8Array, now = Date.now()): boolean {
		throw new Error('Method not implemented.');
	}

	async generate(now = Date.now()): Promise<string> {
		return JSON.stringify({ ...(this.id ? { id: this.id } : {}), seq: this._sequence++, exp: now + this.ageMs });
	}

	generateBin(now = Date.now()): Promise<Uint8Array> {
		throw new Error('Method not implemented.');
	}

	async makeNonce(identifier: string, code: string): Promise<string> {
		return JSON.stringify({ nonceFor: identifier, code });
	}

	makeNonceBin(payloadBin: Uint8Array, codeBin: Uint8Array): Promise<Uint8Array> {
		throw new Error('Method not implemented.');
	}
}
