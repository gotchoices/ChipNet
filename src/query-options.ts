export class QueryOptions {
    queryIdMinEntropy = 250;        // 250 bits of entropy of a maximum 256 bits in 32 bytes
    queryIdLength = 32;             // Update min entropy if this changes
    maxGenerateTries = 50;
    frequencyPValueThreshold = 0.01; // Common threshold for the p-value
    runsPValueThreshold = 0.01;      // Common threshold for the p-value
}