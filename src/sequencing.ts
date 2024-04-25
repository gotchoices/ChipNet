import { Pending } from "./pending";

/** Step sequencing is a process where multiple asynchronous operations are performed in a fixed timing block.
 * @param timeBudget - maximum duration of time.
 * @param requests - The requests to perform.
 */
export async function budgetedStep<RT>(timeBudget: number, requests: Record<string, Pending<RT>>) {
	// A promise that resolves after maximum time
	const maxTimePromise = new Promise<void>(resolve => setTimeout(resolve, timeBudget));

	// Only resolve when all complete, or critical portion achieved and minimum time elapsed
	const thresholdPromise = new Promise<void>(resolve => {
		Object.values(requests).map(p => p.result())
			.forEach(p => p.then(() => {
				if (Object.values(requests).every(r => r.isComplete)) {
					resolve();
				}
			}));
	});

	await Promise.race([
		thresholdPromise,
		maxTimePromise,
	]);
}
