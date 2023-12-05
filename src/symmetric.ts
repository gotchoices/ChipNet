import * as crypto from 'crypto';

// Function to encrypt an object
export function encryptObject(obj: any, key: Buffer): Uint8Array {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(obj), 'utf8'),
        cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine the IV, encrypted data, and authentication tag into a single buffer
    return Buffer.concat([iv, tag, encrypted]);
}

// Function to decrypt to an object
export function decryptObject(encrypted: Uint8Array, key: Buffer): any {
    const iv = encrypted.slice(0, 16);
    const tag = encrypted.slice(16, 32);
    const encData = encrypted.slice(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(encData),
        decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
}