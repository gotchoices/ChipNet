import { Responder } from '../src/responder';
import { ReceiverResponderMessage } from '../src/receiver-responder-message';

type BodyType = { data: string };
describe('Responder', () => {
	it('should send a request and receive a response', async () => {
		const requestBody: BodyType = { data: 'Hello' };
		const responseBody: BodyType = { data: 'World' };
		const requestMessage: ReceiverResponderMessage = {
			messageId: '12345',
			body: requestBody,
		};
		const responseMessage: ReceiverResponderMessage = {
			messageId: '12345',
			body: responseBody,
		};
		let sentMessage: ReceiverResponderMessage | undefined = undefined;
		let processBody: unknown | undefined = undefined;
		const processCallback: (body: unknown) => Promise<unknown> = async (body) => {
			processBody = body;
			return responseBody;
		}
		const sentCallback = async (message: ReceiverResponderMessage) => {
			sentMessage = message;
		};
		const responder = new Responder(processCallback, sentCallback);
		const promise = responder.request(requestMessage);
		await promise;
		expect(sentMessage).toStrictEqual(responseMessage);
		expect(processBody).toStrictEqual(requestBody);
	});

});
