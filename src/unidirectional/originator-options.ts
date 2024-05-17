export class UniOriginatorOptions {
	maxDepth = 7;	// if this changes, also change UniParticipantOptions.maxDepth
	initialBudget = 10000;	// Give plenty of time for our own self
	timingStatBuckets = 20;	// Enough to understand the gradient following the 90th percentile
	paretoQuantile = 0.75;	// Balance between responsiveness and efficiency
	cutoffPaddingMs = 10;		// Extra time in case the distribution is not smooth
	debugBudget?: number;	// If set, use this budget instead of the computed one
}
