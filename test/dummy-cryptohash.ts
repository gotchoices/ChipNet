import { CryptoHash } from 'chipcryptbase';

export class DummyCryptoHash implements CryptoHash {
	private _sequence = 0;

	constructor(private id: string) { }

	isValid(code: string): boolean {
		const { id } = JSON.parse(code);
		return id === this.id;
	}

	async generate(): Promise<string> {
		return JSON.stringify({ id: this.id, seq: this._sequence++ });
	}

	async makeNonce(identifier: string, code: string): Promise<string> {
		return JSON.stringify({ nonceFor: identifier, code });
	}
}
