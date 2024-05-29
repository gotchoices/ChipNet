/** Returned from a node when more searching is possible */
export interface Reentrance {
	readonly path: string[];
	readonly sessionCode: string;
}
