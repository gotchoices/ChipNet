import { arrayToBase64, base64ToArray } from "chipcryptbase";

/**
 * Serializes an object into a JSON string with transformed keys and special handling for Uint8Array.
 *
 * @param {unknown} obj - The object to serialize.
 * @param {Record<string, string>} mapping - A mapping of original keys to their transformed counterparts.
 * @returns {string} The serialized JSON string.
 */
export function serialize(obj: unknown, mapping: Record<string, string>): string {
	return JSON.stringify(serializableMember(obj, mapping));
}

/**
* Recursively transforms object members for serialization, including special handling for Uint8Array.
*
* @param {unknown} obj - The object to be transformed.
* @param {Record<string, string>} mapping - A mapping of original keys to their transformed counterparts.
* @returns {unknown} The transformed object.
*/
function serializableMember(obj: unknown, mapping: Record<string, string>): unknown {
	if (typeof obj !== 'object' || obj === null) {
			return obj;
	}
	if (obj instanceof Uint8Array) {
			return { base64: arrayToBase64(obj) };
	}
	if (Array.isArray(obj)) {
			return obj.map(item => serializableMember(item, mapping));
	}
	return Object.keys(obj as Record<string, unknown>).reduce((newObj, key) => {
			newObj[mapping[key] ?? key] = serializableMember((obj as Record<string, unknown>)[key], mapping);
			return newObj;
	}, {} as Record<string, unknown>);
}

/**
* Deserializes a JSON string into an object with transformed keys reverted and special handling for Uint8Array.
*
* @param {string} json - The JSON string to deserialize.
* @param {Record<string, string>} reverseMapping - A mapping of transformed keys back to their original counterparts.
* @returns {unknown} The deserialized object.
*/
export function deserialize(json: string, reverseMapping: Record<string, string>): unknown {
	return deserializeMember(JSON.parse(json), reverseMapping);
}

/**
* Recursively reverts transformed object members during deserialization, including special handling for Uint8Array.
*
* @param {unknown} obj - The object to revert transformation.
* @param {Record<string, string>} reverseMapping - A mapping of transformed keys back to their original counterparts.
* @returns {unknown} The object with reverted transformations.
*/
function deserializeMember(obj: unknown, reverseMapping: Record<string, string>): unknown {
	if (typeof obj !== 'object' || obj === null) {
			return obj;
	}
	if (Array.isArray(obj)) {
			return obj.map(item => deserializeMember(item, reverseMapping));
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const base64 = (obj as any)['base64'] as string | undefined;
	if (base64 !== undefined) {
			return base64ToArray(base64);
	}
	return Object.keys(obj as Record<string, unknown>).reduce((newObj, key) => {
			newObj[reverseMapping[key] ?? key] = deserializeMember((obj as Record<string, unknown>)[key], reverseMapping);
			return newObj;
	}, {} as Record<string, unknown>);
}
