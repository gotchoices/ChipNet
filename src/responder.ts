import { ReceiverResponderMessage } from './receiver-responder-message';

export class Responder {
	constructor(
		private sendCallback: (message: ReceiverResponderMessage) => void,
		private processCallback: (body: unknown) => Promise<unknown>,
	) {}

	/** A request has been received.  This is async so that errors can be handled by the caller. */
	async request(message: ReceiverResponderMessage) {
		const response = await this.processCallback(message.body);
		this.sendCallback({
			messageId: message.messageId,
			body: response,
		});
	}
}
