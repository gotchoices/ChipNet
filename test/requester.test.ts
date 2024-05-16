import { ReceiverResponderMessage } from '../src/receiver-responder-message';
import { Requester } from '../src/requester';

describe('Requester', () => {
	it('should send a request and receive a response', async () => {
		// TODO: replace with jest mocks if you can get that to work

		let sentMessage: ReceiverResponderMessage | undefined = undefined;
		const requester = new Requester((message) => { sentMessage = message; });
		const requestBody = { data: 'Hello' };
		const responseBody = { data: 'World' };

		const promise = requester.request(requestBody);
		expect(sentMessage).toBeDefined();
		expect(sentMessage).toStrictEqual({
			messageId: sentMessage!.messageId,
			body: requestBody,
		});

		// Simulate a response and check for promise fulfillment
		requester.response({
			messageId: sentMessage!.messageId,
			body: responseBody,
		});
		const result = await promise;
		expect(result).toBe(responseBody);
	});

});
