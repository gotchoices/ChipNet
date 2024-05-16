import crypto from 'crypto';
import { arrayToBase64 } from "chipcryptbase";
import { ReceiverResponderMessage } from './receiver-responder-message';

export class Requester {
	private _pending = new Map<string, (value: unknown) => void>();

	constructor(
		private sendCallback: (message: ReceiverResponderMessage) => void,
	) {}

	request<T>(body: unknown, timeout?: number): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const rawId = crypto.randomBytes(16);
			const message = {
				messageId: arrayToBase64(rawId),
				body
			};
			this.sendCallback(message);
			this._pending.set(message.messageId, resolve as (value: unknown) => void);
			if (timeout) {
				setTimeout(() => {
					if (this._pending.has(message.messageId)) {
						this._pending.delete(message.messageId);
						reject(new Error('Timeout'));
					}
				}, timeout);
			}
		});
	}

	response(message: ReceiverResponderMessage) {
		const resolve = this._pending.get(message.messageId);
		if (resolve) {
			this._pending.delete(message.messageId);
			resolve(message.body);
		}
	}
}
