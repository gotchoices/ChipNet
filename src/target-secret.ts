
export const targetSecretNameMap = {
	identity: 'i',
	originatorAddress: 'oa',
	reference: 'r'
};

export const reverseTargetSecretNameMap = Object.fromEntries(Object.entries(targetSecretNameMap).map(([k, v]) => [v, k]));

/** Information which is provided from originator to target (encrypted) */
export interface TargetSecret {
	identity?: string; // optional hidden identity at the target
	originatorAddress?: string; // logical and possibly physical address of the originator (connection uses session ID to connect)
	reference?: string; // reference info (e.g. invoice #) to give to the target
}
