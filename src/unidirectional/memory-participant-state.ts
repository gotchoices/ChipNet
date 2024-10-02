/* eslint-disable @typescript-eslint/no-unused-vars */
import { UniParticipantState } from "./participant-state";
import { UniQuery } from "./query";
import { CryptoHash } from "chipcryptbase";
import { Pending } from "../pending";
import { QueryResponse } from "../query-struct";
import { TraceFunc } from "../trace";
import { QueryContext } from "./query-context";

export class MemoryUniParticipantState implements UniParticipantState {
	/** Query contexts nested by session code and path */
	private _contexts: Record<string, Record<string, QueryContext>> = {};
	private _cycles: { query: UniQuery, path: string[], collisions: string[] }[] = [];
	private _peerOverheads: Record<string, number> = {};
	public defaultOverhead = 30;	// ms

	constructor(
		public readonly cryptoHash: CryptoHash,
		public readonly trace?: TraceFunc,
	) {
	}

	async validateNewQuery(sessionCode: string, path: string[]): Promise<void> {
		const context = this._contexts[contextKey(sessionCode, path)];
		if (context) {
			throw new Error(`Query '${sessionCode}' already in progress from path ${path.join(',')}`);
		}
	}

	async getContext(sessionCode: string, path: string[]): Promise<QueryContext> {
		const queryState = this._contexts[sessionCode]?.[path.join(',')];
		if (!queryState) {
			throw new Error(`Query '${sessionCode}' from path ${path.join(',')} not found`);
		}
		return queryState;
	}

	async saveContext(context: QueryContext, path: string[]): Promise<void> {
		let sessionContexts = this._contexts[context.query.sessionCode];
		if (!sessionContexts) {
			sessionContexts = {};
			this._contexts[context.query.sessionCode] = sessionContexts;
		}
		sessionContexts[path.join(',')] = context;

		const pathText = path.join(',');
		context.activeQuery?.candidates.filter(c => c.request).forEach(c => {
			const request = c.request!;
			if (!request.isComplete) {
				this.logOutstanding(pathText, request);
			} else if (request.isError) {
				this.logFailure(pathText, errorToString(request.error!));
			} else {
				this.logResponse(pathText, request.response!);
			}
		});
	}

	async reportCycles(query: UniQuery, path: string[], collisions: string[]) {
		this._cycles.push({ query, path, collisions });
	}

	async getPeerOverhead(path: string[]): Promise<number> {
		const overhead = this._peerOverheads[path.join(',')];
		return overhead !== undefined ? overhead : this.defaultOverhead;	// don't us ?? because 0 is a valid value
	}

	async reportOverhead(path: string[], overhead: number): Promise<void> {
		const pathText = path.join(',');
		const existing = this._peerOverheads[pathText];
		this._peerOverheads[pathText] = existing !== undefined
			? Math.trunc((existing + overhead * 2) / 3) // weighted moving average
			: overhead;
	}

	async getNonceToLinkMap(sessionCode: string): Promise<Record<string, string>> {
		return Object.values(this._contexts[sessionCode] || {})
			.reduce((acc, context) => {
				return { ...acc, ...context.linkIdsByNonce };
			}, {});
	}

	async reportTimingViolation(query: UniQuery, path: string[]): Promise<void> {
		// Trace or log
	}

	protected logOutstanding(path: string, request: Pending<QueryResponse>) {
		// Trace or log
	}

	protected logFailure(path: string, error: string) {
		// Trace or log
	}

	protected logResponse(path: string, response: QueryResponse) {
		// Trace or log
	}
}

function contextKey(sessionCode: string, path: string[]) {
	return `${sessionCode}:${path.join(',')}`;
}

function errorToString(error: unknown) {
	return error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
}
