/**
 * Represents the options for generating and validating session IDs.
 */
export class SessionIdOptions {
    /**
     * The minimum entropy required for the generated session ID.
     * Default value is 0.995, which represents 99.5% of the maximum entropy.
     */
    minEntropy = 0.995;

    /**
     * The length of the generated session ID in bytes.
     * Default value is 32.
     */
    length = 32;

    /**
     * The maximum number of attempts to generate a valid session ID (with enough randomness) before erroring.
     * Default value is 100.
     */
    maxGenerateTries = 100;

    /**
     * The upper p-value threshold for the frequency test.
     * Default value is 0.15.
     */
    frequencyPValueThreshold = 0.15;

    /**
     * The lower p-value threshold for the runs test.
     * Default value is 0.60.
     */
    runsPValueThreshold = 0.60;
}
