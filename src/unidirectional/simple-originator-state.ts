import { UniOriginatorOptions } from "./originator-options";
import { UniRequest } from "./request";
import { UniResponse } from "./response";
import { UniQuery } from "./query";
import { generateTransactionId, nonceFromLink } from "../transaction-id";
import { IUniOriginatorState } from "./originator-state";
import { PhaseResponse } from "../phase";
import { UniLink } from "../route";
import { Terms } from "../types";

/** Simple memory based implementation of Uni state */
export class SimpleUniOriginatorState implements IUniOriginatorState {
    private _responses: Record<string, UniResponse> = {};
    private _outstanding: Record<string, UniRequest> = {};
    private _failures: Record<string, string> = {};  // TODO: structured error information
    private _query: UniQuery;
    private _noncesByLink: Record<string, string>;
    private _lastTime = 0;
    private _lastDepth = 1;

    get query() { return this._query; }

    constructor(
        public options: UniOriginatorOptions,
        public peerLinks: UniLink[],
        public target: string,  // Target address or identity token (not a link)
        public terms: Terms,   // Arbitrary query data to be passed to the target for matching
    ) {
        const transactionId = generateTransactionId(this.options.transactionIdOptions);
        this._query = { target: this.target, transactionId: transactionId, terms: this.terms };
        this._noncesByLink = this.peerLinks.reduce((c, link) => {
                c[link.id] = nonceFromLink(link.id, transactionId);;
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

    /** @returns The nodes peer links.  Do not mutate */
    async getPeerLinks() {
        return this.peerLinks;
    }

    getRoutes() {
        return Object.entries(this._responses)
            .flatMap(([link, response]) => response.routes.flatMap(p => response.routes))
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

    getResponse(link: string): UniResponse | undefined {
        return this._responses[link];
    }

    private addResponse(link: string, response: UniResponse) {
        this._responses[link] = response;
        delete this._outstanding[link];
    }

    /**
     * @returns The currently outstanding requests.  Do not mutate
     */
    getOutstanding() {
        return this._outstanding;
    }

    addOutstanding(link: string, request: UniRequest) {
        this._outstanding[link] = request;
    }

    shouldAdvance(link: string) {
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