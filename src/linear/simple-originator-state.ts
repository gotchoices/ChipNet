import { LinearOriginatorOptions } from "./originator-options";
import { LinearRequest } from "./request";
import { LinearResponse } from "./response";
import { LinearQuery } from "./query";
import { LinearRoute } from "./route";
import { ILinearOriginatorState, LevelResponse } from "./originator-state";
import { generateQueryId, nonceFromAddress } from "../query-id";

/** Simple memory based implementation of linear state */
export class SimpleLinearOriginatorState implements ILinearOriginatorState {
    private _responses: Record<string, LinearResponse> = {};
    private _outstanding: Record<string, LinearRequest> = {};
    private _failures: Record<string, string> = {};  // TODO: structured error information
    private _query: LinearQuery;
    private _noncesByAddress: Record<string, string>;
    private _lastTime: number = 0;

    get query() { return this._query; }

    constructor(
        public options: LinearOriginatorOptions
    ) {
        const queryId = generateQueryId(this.options.queryOptions);
        this._query = { target: this.options.target, queryId };
        this._noncesByAddress = this.options.peerAddresses.reduce((c, address) => {
                c[address] = nonceFromAddress(address, queryId);;
                return c;
            }, {} as Record<string, string>
        );
    }

    async startDepth() { }

    async completeDepth(responses: LevelResponse) {
        Object.entries(responses.failures).forEach(([address, error]) => 
            this.addFailure(address, error));

        Object.entries(responses.results).forEach(([address, response]) => 
            this.addResponse(address, response));

        this._lastTime = Math.max(responses.actualTime, this._lastTime);    // (don't allow a quickly returning depth prevent giving time for propagation)
    }

    getRoutes() {
        return Object.entries(this._responses)
            .flatMap(([address, response]) => response.paths.map(p => new LinearRoute(address, response.depth, p)))
    }

    /**
     * @returns The currently failed requests.  Do not mutate
     */
    getFailures() {
        return this._failures;
    }

    private addFailure(address: string, error: string) {
        this._failures[address] = error;
        delete this._outstanding[address];
    }

    getResponse(address: string): LinearResponse | undefined {
        return this._responses[address];
    }

    private addResponse(address: string, response: LinearResponse) {
        this._responses[address] = response;
        delete this._outstanding[address];
    }

    /**
     * @returns The currently outstanding requests.  Do not mutate
     */
    getOutstanding() {
        return this._outstanding;
    }

    addOutstanding(address: string, request: LinearRequest) {
        this._outstanding[address] = request;
    }

    canAdvance(address: string) {
        // Can advance if hasn't failed, already been queued, or responded with no data
        return !this._failures[address]
            && !this._outstanding[address]
            && (!this._responses.hasOwnProperty(address) || Boolean(this._responses[address]?.hiddenData));
    }

    getNonce(address: string) {
        const result = this._noncesByAddress[address];
        if (!result) {
            throw Error("Unable to find nonce for address");
        }
        return result;
    }
}