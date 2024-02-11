import { AsymmetricVault } from "chipcryptbase";

export class DummyAsymmetricalVault implements AsymmetricVault {
	constructor(private id: string) { }

	async getPublicKey(): Promise<Uint8Array> {
		// Convert the ID string to a Uint8Array (assuming UTF-8 encoding)
		return new TextEncoder().encode(`<${this.id}>`);
	}

	async getPublicKeyAsString(): Promise<string> {
		// Return the ID as the public key string
		return `<${this.id}>`;
	}

	async encrypt(data: string): Promise<string> {
		// "Encrypt" by wrapping data in an object and converting to JSON
		return JSON.stringify({ encryptedData: data });
	}

	async decrypt(encryptedDataJson: string): Promise<string> {
		// "Decrypt" by parsing the JSON and extracting the data
		try {
			const { encryptedData } = JSON.parse(encryptedDataJson);
			return encryptedData;
		} catch (error) {
			throw new Error("Invalid encrypted data format");
		}
	}

	async sign(data: string): Promise<string> {
		// Dummy sign: return the data in a signature object
		return JSON.stringify({ signed: data, by: this.id });
	}

	async verify(data: string, signature: string): Promise<boolean> {
		// Dummy verify: check if the data and signature match
		const { signed, by } = JSON.parse(signature);
		return data === signed && by === this.id;
	}
}
