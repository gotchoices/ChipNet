import { LinearOriginatorOptions } from "./originator-options";
import { LinearRequest } from "./request";
import { LinearResponse } from "./response";
import { LinearQuery } from "./query";
import { LinearRoute } from "./route";
import { generateQueryId, nonceFromLink } from "../query-id";
import { ILinearOriginatorState } from "./originator-state";
import { PhaseResponse } from "../phase";

/** Simple memory based implementation of linear state */
export class SimpleLinearOriginatorState implements ILinearOriginatorState {
    private _responses: Record<string, LinearResponse> = {};
    private _outstanding: Record<string, LinearRequest> = {};
    private _failures: Record<string, string> = {};  // TODO: structured error information
    private _query: LinearQuery;
    private _noncesByLink: Record<string, string>;
    private _lastTime = 0;
    private _lastDepth = 1;

    get query() { return this._query; }

    constructor(
        public options: LinearOriginatorOptions,
        public target: string,  // Target address or identity token (not a link)
        public terms: any,   // Arbitrary query data to be passed to the target for matching
    ) {
        const queryId = generateQueryId(this.options.queryOptions);
        this._query = { target: this.target, queryId, terms: this.terms };
        this._noncesByLink = this.options.peerLinks.reduce((c, link) => {
                c[link] = nonceFromLink(link, queryId);;
                return c;
            }, {} as Record<string, string>
        );
    }

    async getDepth(): Promise<number> {
        return this._lastDepth;
    }

    async startPhase(depth: number) {
        this._lastDepth = depth;
    }

    async completePhase(phaseResponse: PhaseResponse) {
        Object.entries(phaseResponse.failures).forEach(([link, error]) => 
            this.addFailure(link, error));

        Object.entries(phaseResponse.results).forEach(([link, response]) => 
            this.addResponse(link, response));

        this._lastTime = Math.max(phaseResponse.actualTime, this._lastTime);    // (don't allow a quickly returning depth prevent giving time for propagation)
    }

    getRoutes() {
        return Object.entries(this._responses)
            .flatMap(([link, response]) => response.paths.map(p => new LinearRoute(link, response.depth, p)))
    }

    /**
     * @returns The currently failed requests.  Do not mutate
     */
    getFailures() {
        return this._failures;
    }

    private addFailure(link: string, error: string) {
        this._failures[link] = error;
        delete this._outstanding[link];
    }

    getResponse(link: string): LinearResponse | undefined {
        return this._responses[link];
    }

    private addResponse(link: string, response: LinearResponse) {
        this._responses[link] = response;
        delete this._outstanding[link];
    }

    /**
     * @returns The currently outstanding requests.  Do not mutate
     */
    getOutstanding() {
        return this._outstanding;
    }

    addOutstanding(link: string, request: LinearRequest) {
        this._outstanding[link] = request;
    }

    canAdvance(link: string) {
        // Can advance if hasn't failed, already been queued, or responded with no data
        return !this._failures[link]
            && !this._outstanding[link]
            && (!this._responses.hasOwnProperty(link) || Boolean(this._responses[link]?.hiddenReentrance));
    }

    getNonce(link: string) {
        const result = this._noncesByLink[link];
        if (!result) {
            throw Error("Unable to find nonce for link");
        }
        return result;
    }
}