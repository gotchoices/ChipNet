import { createECDH, ECDH, createSign, createVerify, createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import * as secp256k1 from 'secp256k1';

export interface KeyPair {
	privateKey: string;
	publicKey: string;
}

export function generateKeyPairBin() {
	let privateKey: Buffer;
	do {
		privateKey = randomBytes(32);
	} while (!secp256k1.privateKeyVerify(privateKey));

	const publicKey = secp256k1.publicKeyCreate(privateKey);
	return { privateKey, publicKey };
}

export function generateKeyPair() {
	const pair = generateKeyPairBin();
	return { privateKey: pair.privateKey.toString('base64'), publicKey: pair.publicKey.toString('base64') } as KeyPair;
}

export function signData(privateKeyBase64: string, content: string): string {
	const digest = createHash('sha256').update(content).digest();
	const privateKey = Buffer.from(privateKeyBase64, 'base64');
	const signedData = secp256k1.ecdsaSign(digest, privateKey);
	return Buffer.from(signedData.signature).toString('base64');
}

export function verifyData(publicKeyBase64: string, content: string, signatureBase64: string): boolean {
	const digest = createHash('sha256').update(content).digest();
	const publicKey = Buffer.from(publicKeyBase64, 'base64');
	const signature = Buffer.from(signatureBase64, 'base64');
	return secp256k1.ecdsaVerify(signature, digest, publicKey);
}

export function encryptWithPublicKey(publicKeyBase64: string, data: string): string {
	const publicKey = Buffer.from(publicKeyBase64, 'base64');
	const ephemeralPair = generateKeyPairBin();
	const sharedSecret = secp256k1.ecdh(publicKey, ephemeralPair.privateKey);

	const hash = createHash('sha256').update(sharedSecret).digest();
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-256-gcm', hash, iv);

	const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return JSON.stringify({
		ephemeralPublicKey: ephemeralPair.publicKey.toString('base64'),
		iv: iv.toString('base64'),
		encryptedData: encrypted.toString('base64'),
		authTag: authTag.toString('base64')
	});
}

export function decryptWithPrivateKey(privateKeyBase64: string, encryptedDataJson: string): string {
	const privateKey = Buffer.from(privateKeyBase64, 'base64');
	const encryptedData = JSON.parse(encryptedDataJson);

	const ephemeralPublicKey = Buffer.from(encryptedData.ephemeralPublicKey, 'base64');
	const sharedSecret = secp256k1.ecdh(ephemeralPublicKey, privateKey);

	const hash = createHash('sha256').update(sharedSecret).digest();
	const iv = Buffer.from(encryptedData.iv, 'base64');
	const decipher = createDecipheriv('aes-256-gcm', hash, iv);
	decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));

	const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData.encryptedData, 'base64')), decipher.final()]);
	return decrypted.toString();
}
