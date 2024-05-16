import { Responder } from '../src/responder';
import { ReceiverResponderMessage } from '../src/receiver-responder-message';

describe('Responder', () => {
	it('should send a request and receive a response', async () => {
		const requestBody = { data: 'Hello' };
		const responseBody = { data: 'World' };
		const requestMessage = {
			messageId: '12345',
			body: requestBody,
		};
		const responseMessage = {
			messageId: '12345',
			body: responseBody,
		};
		let sentMessage: ReceiverResponderMessage | undefined = undefined;
		let processBody: unknown | undefined = undefined;
		const processCallback: (body: unknown) => Promise<unknown> = async (body) => {
			processBody = body;
			return responseBody;
		}
		const sentCallback = (message: ReceiverResponderMessage) => {
			sentMessage = message;
		};
		const responder = new Responder(sentCallback, processCallback);
		const promise = responder.request(requestMessage);
		await promise;
		expect(sentMessage).toStrictEqual(responseMessage);
		expect(processBody).toStrictEqual(requestBody);
	});

});
