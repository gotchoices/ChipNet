import crypto from 'crypto';

export function hashDeep(hash: crypto.Hash, data: unknown) {
	if (typeof data !== 'object' || data === null) {
		hash.update(String(data));
		return;
	}

	const keys = Object.keys(data).sort();
	for (const key of keys) {
		hash.update(key);
		hashDeep(hash, data[key as keyof typeof data]);
	}
}
