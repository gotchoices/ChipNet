import { jest } from '@jest/globals';
import { describe, expect, test } from '@jest/globals';
import { bufferToBinaryString, calculateShannonEntropy, frequencyTest, generateTransactionId, runsTest, validateTransactionId } from '../src/transaction-id';
import { TransactionIdOptions } from './transaction-id-options';
import crypto from 'crypto';

describe('runsTest', () => {
	test('Base64 conversions', () => {
		var bytes = Buffer.from(binaryStringToBase64('1010101100011010'), 'base64');
		var bytesBase64 = bytes.toString('base64');
		var backToBytes = Buffer.from(bytesBase64, 'base64');
		const binarySequence = bufferToBinaryString(backToBytes);

		expect(backToBytes.toString('base64')).toBe(bytesBase64);
		expect(binarySequence).toBe(bufferToBinaryString(bytes));
	});

	test('should return true for a valid salt input', () => {
		const salt = '0SIAThaOI0FNxD48wx1M9zkwfaIWVi3ugu0hrNqvsGI='; // Example salt input
		const threshold = 0.01; // Example threshold

		const result = runsTest(salt, threshold);

		expect(result).toBe(true);
	});

	test('should return true for a valid binary sequence', () => {
		const salt = '1100101000101110'; // Example binary sequence
		const threshold = 0.01; // Example threshold

		const result = runsTest(binaryStringToBase64(salt), threshold);

		expect(result).toBe(true);
	});

	test('should return false for an invalid binary sequence', () => {
		const salt = '1111111100000000'; // Example binary sequence
		const threshold = 0.01; // Example threshold

		const result = runsTest(binaryStringToBase64(salt), threshold);

		expect(result).toBe(false);
	});
});

function binaryStringToBase64(binaryString: string): string {
	// Convert binary string to byte array
	let byteArray = new Uint8Array(binaryString.length / 8);
	for (let i = 0; i < byteArray.length; i++) {
		byteArray[i] = parseInt(binaryString.slice(i * 8, i * 8 + 8), 2);
	}

	// Convert byte array to base64 string
	let base64String = btoa(String.fromCharCode.apply(null, Array.from(byteArray)));
	return base64String;
}

describe('validateTransactionId', () => {
	test('Informational: how many random transaction IDs pass validation', () => {
		// generate 1000 random transaction IDs and see how often they pass validation
		const options = new TransactionIdOptions();
		let valid = [0,0,0,0];
		for (let i = 0; i < 1000; i++) {
			const tid = crypto.randomBytes(32).toString('base64');
			const tests = [
				calculateShannonEntropy(tid) >= options.minEntropy ? 1 : 0,
				frequencyTest(tid, options.frequencyPValueThreshold) ? 1 : 0,
				runsTest(tid, options.runsPValueThreshold) ? 1 : 0,
			];
			tests.push(tests[0] && tests[1] && tests[2] ? 1 : 0);
			tests.forEach((test, i) => {
				valid[i] += test;
			});
		}
		console.log(`${valid[0]} of 1000 passed Shannon entropy test`);
		console.log(`${valid[1]} of 1000 passed frequency test`);
		console.log(`${valid[2]} of 1000 passed runs test`);
		console.log(`${valid[3]} of 1000 passed all tests`);
	});

	test('should return true for a valid transaction ID', () => {
		const salt = '0SIAThaOI0FNxD48wx1M9zkwfaIWVi3ugu0hrNqvsGI='; // Example salt input
		const options = new TransactionIdOptions();

		const result = validateTransactionId(salt, options);

		expect(result).toBe(true);
	});

	test('should return false for an invalid transaction ID', () => {
		const salt = 'AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSTTUUVV='; // Example salt input
		const options = new TransactionIdOptions();

		const result = validateTransactionId(salt, options);

		expect(result).toBe(false);
	});
});
