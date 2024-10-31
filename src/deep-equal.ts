export function deepEqual(a: unknown, b: unknown): boolean {
	// Check if they are the same object reference
	if (a === b) return true;

	// Check if they are of different types or null
	if (typeof a !== 'object' || a === null ||
		typeof b !== 'object' || b === null) {
		return false;
	}

	// Check if they have the same number of keys
	const keys1 = Object.keys(a);
	const keys2 = Object.keys(b);
	if (keys1.length !== keys2.length) return false;

	// Recursively check each key-value pair
	for (const key of keys1) {
		if (!(key in b) || !deepEqual(a[key as keyof typeof a], b[key as keyof typeof b])) {
			return false;
		}
	}

	return true;
}
