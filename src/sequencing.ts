/**
	Step sequencing is a process where multiple asynchronous operations are performed in a fixed timing block.
	Note that this is independent code, and could be moved into its own package.
*/

import { Pending } from "./pending";

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
 * @param baseDuration - All timing is relative (in addition to) to this base duration of time.
 * @param requests - The requests to perform.
 * @param options - The options for the step.
 * @returns The elapsed time for the step.
 */
export async function sequenceStep<RT>(baseDuration: number, requests: Record<string, Pending<RT>>, options: StepOptions) {
	const startTime = Date.now();

	// A promise that resolves after minimum time
	const minTimePromise = new Promise(resolve => setTimeout(resolve, baseDuration + options.minTimeMs));

	// A promise that resolves after maximum time
	const maxTimePromise = new Promise<void>(resolve => setTimeout(resolve, baseDuration + options.maxTimeMs));

	// Only resolve when all complete, or critical portion acheived and minimum time elapsed
	const thresholdPromise = new Promise<void>(resolve => {
		Object.values(requests).map(p => p.result())
			.forEach(p => p.then(() => {
				if (passesThreshold()) {
					resolve();
				}
			}));
	});

	await Promise.race([
		thresholdPromise,
		maxTimePromise,
		minTimePromise.then(() => thresholdPromise)
	]);

	return Date.now() - startTime;

	function passesThreshold() {
		let responseCount = 0;
		let failureCount = 0;
		let allCount = 0;
		Object.values(requests).forEach(r => {
			responseCount += (r.isResponse as unknown as number);	// In javascript, 1 + true = 2
			failureCount += (r.isError as unknown as number);
			++allCount;
		});
		return (responseCount + failureCount) === allCount	// All requests have been resolved
			|| (	// Or the minimum ratio has been met and the minimum time has elapsed
				responseCount >= (options.minRatio * allCount)
					&& Date.now() - startTime >= baseDuration + options.minTimeMs
			)
	}
}
