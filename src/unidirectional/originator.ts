import { UniOriginatorState } from "./originator-state";
import { Plan } from "../plan";
import { Centroid, Sparstogram } from "sparstogram";
import { intentsSatisfied } from "../intent";
import { UniParticipant } from ".";
import { QueryRequest, QueryStats } from "../query-struct";

/** Time budget for synchronized query cycles */
interface Budget {
	net: number;			// Total budget minus overhead
	growth: number;		// The increase from one level to the next
	overhead: number;	// Overhead between the originator and the participant
}

export class UniOriginator {

	constructor(
		private state: UniOriginatorState,
		private participant: UniParticipant,
	) {
	}

	async discover(): Promise<Plan[]> {
		let budget: Budget = await this.initialTimeBudget();
		let request = { first: { plan: { path: [], participants: [], members: {} }, query: this.state.query }, budget: budget.net } as QueryRequest;
		for (let i = 0; i <= this.state.options.maxDepth; i++) {
			const t1 = Date.now();
			const response = await this.participant.query(request);
			const duration = Date.now() - t1;
			if (!response.plans || !intentsSatisfied(this.state.query.intents, response.plans)) {
				if (!response.canReenter) {
					break;
				}
				budget = this.nextBudget(this.validatedStats(response.stats), budget, duration, i);
				request = {
					reentrance: { sessionCode: this.state.query.sessionCode },
					budget: budget.net
				};
			} else {
				return response.plans!;
			}
		}
		return [];
	}

	private async initialTimeBudget() {
		if (this.state.options.debugBudget) {
			return { net: this.state.options.debugBudget, growth: this.state.options.debugBudget, overhead: 0 };
		}

		const growth = (await this.state.getLearnedGrowth()) ?? this.state.options.initialBudget;
		return { net: growth, growth, overhead: 0 } as Budget;
	}

	private validatedStats(stats: QueryStats): QueryStats {
		// TODO: validate stats
		return stats;
	}

	private nextBudget(stats: QueryStats, givenBudget: Budget, actualDuration: number, depth: number) {
		if (this.state.options.debugBudget) {
			return { net: this.state.options.debugBudget * depth, growth: this.state.options.debugBudget, overhead: 0 };
		}

		const ideal = this.estimateIdeal(stats);	//...if we had given a better budget we think it would have been this
		const growth = givenBudget.growth + (ideal - givenBudget.net);
		const net = ideal + growth;
		const overhead = actualDuration - givenBudget.net;
		return { net, growth, overhead };
	}

	private estimateIdeal(stats: QueryStats) {
		// Compute the pareto percentile based on the histogram.
		const cutoff = this.computePareto(stats);
		// Compute the linear projection of the remaining time.
		const tailTime = (cutoff - stats.earliest) / this.state.options.paretoQuantile * (1 - this.state.options.paretoQuantile);
		return cutoff + Math.max(0, tailTime);
	}

	/** Compute the pareto (80/20 rule) cutoff for the response times */
	private computePareto(stats: QueryStats): number {
		const sparstogram = new Sparstogram(this.state.options.timingStatBuckets, [this.state.options.paretoQuantile]);
		sparstogram.append(...stats.timings);
		if (sparstogram.centroidCount >= 4) {	// Some signal
			if (stats.outstanding > 0) {	// Some missing on the tail - try to simulate missing tail
				if (sparstogram.count > stats.outstanding) {	// Enough points to mirror the head to reproduce the tail
					mirrorHead(sparstogram, stats);
					return sparstogram.markerAt(0).value;
				} else { // Too many outstanding to recreate tail with head; project using growth rate
					sparstogram.maxCentroids = 2;	// Compress to two centroids
					const iter = sparstogram.ascending();
					const tail = iter.next().value;
					const next = iter.next().value;
					const growthRate = (tail.count - next.count) / (tail.value - next.value);
					if (growthRate > 0) {
						const projectedTail = growthRate * (stats.outstanding - sparstogram.count) + tail.value;
						return (projectedTail - stats.earliest) * this.state.options.paretoQuantile;
					}
				}
			} else {	// No missing tail - just use the pareto percentile
				return sparstogram.markerAt(0).value;
			}
		}
		// If growth rate is negative, or we don't have enough data to extrapolate, just assume the actual time given
		return stats.earliest + (stats.gross - stats.earliest) * this.state.options.paretoQuantile;
	}
}

function mirrorHead(sparstogram: Sparstogram, stats: QueryStats) {
	const tail = sparstogram.descending().next().value;
	const quantile = sparstogram.valueAt(stats.outstanding); // Point at the rank of the number outstanding
	const head = Array.from(sparstogram.descending({ quantile }));
	// Account for potentially being "part way" through the bucket (subtract from count)
	if (head.length) {
		head[0] = { ...head[0], count: head[0].count - quantile.offset };
	}
	sparstogram.append(...head.map(c => ({ value: tail.value + (quantile.value - c.value), count: c.count, variance: c.variance } as Centroid)));
}
