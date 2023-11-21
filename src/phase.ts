import { LinearRequest } from "./linear/request";
import { LinearResponse } from "./linear/response";

export interface PhaseResponse {
    results: LinearResponse[]; 
    failures: Record<string, string>; 
    actualTime: number;
}

export class PhaseOptions {
    minTime: number = 30;
    maxTime: number = 500;
    minRatio: number = 0.6;
}

export async function waitPhase(baseTime: number, requests: Record<string, LinearRequest>, options: PhaseOptions) {
    const startTime = Date.now();
    const responses: LinearResponse[] = [];
    const failures: Record<string, string> = {};

    // A promise that resolves after a minimum time
    const minTimePromise = new Promise(resolve => setTimeout(resolve, baseTime + options.minTime));

    // Map each request to a promise
    const promises = Object.entries(requests).map(async ([link, request]) => {
        try {
            const response = await request.response;
            const linearResponse = new LinearResponse(link, request.depth, response.paths, response.hiddenReentrance);
            responses.push(linearResponse);
            return linearResponse;
        } catch (error) {
            failures[link] = error instanceof Error ? error.message : error;
        }
    });

    // Only resolve when all complete, or critical portion acheived and minimum time elapsed
    const wrappedPromise = new Promise<LinearResponse[]>(resolve => {
        promises.forEach(p => p.then(() => {
            if (passesThreshold()) {
                resolve(responses);
            }
        }));
    });

    const results = await Promise.race([
        wrappedPromise,
        new Promise<LinearResponse[]>(resolve => setTimeout(() => resolve(responses), baseTime + options.maxTime)),
        minTimePromise.then(() => wrappedPromise)
    ]);
    return { results, failures, actualTime: Date.now() - startTime } as PhaseResponse;

    function passesThreshold() {
        return responses.length === promises.length 
            || (responses.length >= (options.minRatio * promises.length) 
                && Date.now() - startTime >= baseTime + options.minTime)
    }
}

