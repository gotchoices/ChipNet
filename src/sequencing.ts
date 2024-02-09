/**
	Step sequencing is a process where multiple asynchronous operations are performed in a fixed timing block.
	Note that this is independent code, and could be moved into its own package.
*/

/** Result of the step */
export interface StepResponse<RT> {
	results: Record<string, RT>;
	failures: Record<string, string>;
	outstanding: Record<string, Promise<RT>>;
	actualTime: number;
}

export class StepOptions {
	/** The minimum time that must elapse before terminating the step, unless all results are in. */
	minTimeMs: number = 30;
	/** After this duration, the step will terminate regardless of results. */
	maxTimeMs: number = 500;
	/** The minimum ratio of responses to requests to consider the step complete.
	 * If this ratio is met, and the minimum time is elapsed, the step will terminate. */
	minRatio: number = 0.6;
}

/** Perform a coordinated sequence step.
 * @param baseTime - All timing is relative (in addition to) to this base amount of time.
 * @param requests - The requests to perform.
 * @param options - The options for the step.
 * @returns The results of the step.
 */
export async function sequenceStep<RT>(baseTime: number, requests: Record<string, Promise<RT>>, options: StepOptions) {
	const startTime = Date.now();
	const responses: Record<string, RT> = {};
	const failures: Record<string, string> = {};

	// A promise that resolves after a minimum time
	const minTimePromise = new Promise(resolve => setTimeout(resolve, baseTime + options.minTimeMs));

	// Map each request to a promise
	const promises = Object.entries(requests).map(async ([key, request]) => {
		try {
			const response = await request;
			responses[key] = response
			return response;
		} catch (error) {
			failures[key] = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
		}
	});

	// Only resolve when all complete, or critical portion acheived and minimum time elapsed
	const wrappedPromise = new Promise<Record<string, RT>>(resolve => {
		promises.forEach(p => p.then(() => {
			if (passesThreshold()) {
				resolve(responses);
			}
		}));
	});

	const results = await Promise.race([
		wrappedPromise,
		new Promise<Record<string, RT>>(resolve => setTimeout(() => resolve(responses), baseTime + options.maxTimeMs)),
		minTimePromise.then(() => wrappedPromise)
	]);

	const outstanding = Object.fromEntries(Object.keys(requests)
		.filter(k => !Object.prototype.hasOwnProperty.call(results, k))
		.map(k => [k, requests[k]])
	) as Record<string, Promise<RT>>;
	// Note: don't add anything async after capturing outstanding as that could invalidate results and thus invalidate outstanding

	return { results, failures, outstanding, actualTime: Date.now() - startTime } as StepResponse<RT>;

	function passesThreshold() {
		const responseCount = Object.keys(responses).length;
		return (responseCount + Object.keys(failures).length) === promises.length
			|| (
				responseCount >= (options.minRatio * promises.length)
				&& Date.now() - startTime >= baseTime + options.minTimeMs)
	}
}

