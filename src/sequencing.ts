import { UniRequest } from "./unidirectional/request";
import { UniResponse } from "./unidirectional/response";

export interface StepResponse {
    results: UniResponse[];
    failures: Record<string, string>;
    actualTime: number;
}

export class StepOptions {
    minTime: number = 30;
    maxTime: number = 500;
    minRatio: number = 0.6;
}

export async function sequenceStep(baseTime: number, requests: Record<string, UniRequest>, options: StepOptions) {
    const startTime = Date.now();
    const responses: UniResponse[] = [];
    const failures: Record<string, string> = {};

    // A promise that resolves after a minimum time
    const minTimePromise = new Promise(resolve => setTimeout(resolve, baseTime + options.minTime));

    // Map each request to a promise
    const promises = Object.entries(requests).map(async ([link, request]) => {
        try {
            const response = await request.response;
            const uniResponse = new UniResponse(link, response.plans, response.hiddenReentrance);
            responses.push(uniResponse);
            return uniResponse;
        } catch (error) {
            failures[link] = error instanceof Error ? error.message : error;
        }
    });

    // Only resolve when all complete, or critical portion acheived and minimum time elapsed
    const wrappedPromise = new Promise<UniResponse[]>(resolve => {
        promises.forEach(p => p.then(() => {
            if (passesThreshold()) {
                resolve(responses);
            }
        }));
    });

    const results = await Promise.race([
        wrappedPromise,
        new Promise<UniResponse[]>(resolve => setTimeout(() => resolve(responses), baseTime + options.maxTime)),
        minTimePromise.then(() => wrappedPromise)
    ]);
    return { results, failures, actualTime: Date.now() - startTime } as StepResponse;

    function passesThreshold() {
        return (responses.length + Object.keys(failures).length) === promises.length
            || (
							responses.length >= (options.minRatio * promises.length)
                && Date.now() - startTime >= baseTime + options.minTime)
    }
}

