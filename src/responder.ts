import { ReceiverResponderMessage } from './receiver-responder-message';

export class Responder {
	constructor(
		private processCallback: (body: unknown) => Promise<unknown>,
		private sendCallback: (message: ReceiverResponderMessage) => Promise<void>,
	) {}

	/** A request has been received.  This is async so that errors can be handled by the caller. */
	async request(message: ReceiverResponderMessage) {
		let response: unknown;
		try
		{
			response = await this.processCallback(message.body);
		}
		catch (error)
		{
			await this.sendCallback({
				messageId: message.messageId,
				error: error instanceof Error ? error.message : String(error),
			});
			return;
		}
		await this.sendCallback({
			messageId: message.messageId,
			body: response,
		} as ReceiverResponderMessage);
	}
}
