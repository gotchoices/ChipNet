import crypto from 'crypto';
import { arrayToBase64 } from "chipcryptbase";
import { ReceiverResponderMessage } from './receiver-responder-message';

export class Requester {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private _pending = new Map<string, { resolve: (value: unknown) => void, reject: (reason?: any) => void }>();

	request<T>(body: unknown, sendCallback: (message: ReceiverResponderMessage) => Promise<void>, timeout?: number): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const rawId = crypto.randomBytes(16);
			const message = {
				messageId: arrayToBase64(rawId),
				body
			} as ReceiverResponderMessage;
			sendCallback(message).catch(reject);
			this._pending.set(message.messageId, { resolve: resolve as (value: unknown) => void, reject });
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
		const handler = this._pending.get(message.messageId);
		if (handler) {
			this._pending.delete(message.messageId);
			if (Object.hasOwn(message, 'error')){
				handler.reject(message.error);
			} else {
				handler.resolve(message.body);
			}
		}
	}
}
