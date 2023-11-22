import crypto from 'crypto';
import { TransactionIdOptions } from './transaction-id-options';

function checkSaltLength(salt: string, minLength: number): boolean {
    return Buffer.byteLength(salt, 'utf-8') >= minLength;
}

/**
 * Shannon entropy is a measure of randomness present in a dataset.  It is measured in bits, and its value depends on the length 
 * and character set of the string being analyzed. For a salt, the maximum possible entropy is determined by the log base 2 of
 * the number of possible characters in the character set, multiplied by the length of the string.
 */
function calculateShannonEntropy(salt: string): number {
    const probabilities = new Map<string, number>();
    for (const char of salt) {
        probabilities.set(char, (probabilities.get(char) || 0) + 1);
    }

    return [...probabilities.values()].reduce((entropy: number, freq: number) => {
        const p = freq / salt.length;
        return entropy - p * Math.log2(p);
    }, 0);
}

/**
 * The Frequency (Monobit) Test is used to assess the randomness of a sequence of bits.  This is part of the NIST Statistical Test Suite for Randomness
 * @returns true if the probability exceeds the given threshold
 */
function frequencyTest(salt: string, threshold: number): boolean {
    const binarySequence = Buffer.from(salt).toString('binary');
    let sum = 0;
    for (let i = 0; i < binarySequence.length; i++) {
        sum += binarySequence.charCodeAt(i) === 0 ? -1 : 1;
    }

    const s_obs = Math.abs(sum) / Math.sqrt(binarySequence.length);
    const p_value = Math.exp(-2 * s_obs * s_obs);

    return p_value > threshold; // Common threshold for the p-value
}

/**
 * Calculates the error function of a given number using a polynomial approximation.
 */
function erf(x: number): number {
    // Using an approximation of the error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

/**
 * Returns the complementary approximate error function of a number.
 */
function erfc(x: number): number {
    return 1 - erf(x);
}

/**
 * This test checks the total number of runs in the sequence (a run is an uninterrupted sequence of identical bits). 
 * The number of runs in a random sequence should follow a specific distribution.  This is part of the NIST Statistical Test Suite for Randomness
 * @returns true if the probability exceeds the given threshold
 */
function runsTest(salt: string, threshold: number): boolean {
    const binarySequence = Buffer.from(salt).toString('binary');
    let totalRuns = 1;
    let ones = 0;

    for (let i = 0; i < binarySequence.length; i++) {
        ones += binarySequence.charCodeAt(i) === 0 ? 0 : 1;
        if (i < binarySequence.length - 1) {
            totalRuns += binarySequence.charCodeAt(i) !== binarySequence.charCodeAt(i + 1) ? 1 : 0;
        }
    }

    const pi = ones / binarySequence.length;
    if (Math.abs(pi - 0.5) >= 2 / Math.sqrt(binarySequence.length)) {
        return false; // The test is not applicable if pi is too far from 0.5
    }

    const vObs = totalRuns;
    const p_value = erfc(Math.abs(vObs - 2 * binarySequence.length * pi * (1 - pi)) / (2 * Math.sqrt(2 * binarySequence.length) * pi * (1 - pi)));

    return p_value > threshold;
}

/** Ensures that the given salt passes all of the tests for a Transaction ID */
export function validateTransactionId(salt: string, options: TransactionIdOptions) {
    return checkSaltLength(salt, options.length) 
        && calculateShannonEntropy(salt) >= options.minEntropy
        && frequencyTest(salt, options.frequencyPValueThreshold)
        && runsTest(salt, options.runsPValueThreshold);
}

/**
 * Generates a unique Transaction ID with sufficient entropy based on the given options.
 * @throws An error if a Transaction ID with sufficient entropy cannot be generated within the maximum number of tries specified in the options.
 */
export function generateTransactionId(options: TransactionIdOptions) {
    var candidate: string;
    var tries = 0;
    do {
        if (tries > options.maxGenerateTries) {
            throw new Error('Unable to generate a Transaction ID with sufficient entropy');
        }
        candidate = crypto.randomBytes(options.length).toString('base64');
        ++tries;
    } while (!validateTransactionId(candidate, options));
    return candidate;
}

/**
 * Generate anonymized identifier using a Transaction ID as a salt
 */
export function nonceFromLink(link: string, transactionId: string) {
    return crypto.createHash('sha256')
        .update(link + transactionId)
        .digest('base64');
}