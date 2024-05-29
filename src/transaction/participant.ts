import { Asymmetric, AsymmetricVault, CryptoHash, base64ToArray } from "chipcryptbase";
import { MemberTypes } from "../member";
import { TrxParticipantState } from "./participant-state";
import { Signature, SignatureTypes, TrxRecord } from "./record";
import * as crypto from 'crypto';
import { TrxParticipantOptions } from ".";
import { TrxParticipantResource } from "./participant-resource";

enum RecordState {
	promising,
	ourPromiseNeeded,
	consensus,
	ourCommitNeeded,
	rejected,
	propagating,
}

export class TrxParticipant {
	constructor(
		public state: TrxParticipantState,
		public vault: AsymmetricVault,
		public asymmetric: Asymmetric,
		public cryptoHash: CryptoHash,
		public options: TrxParticipantOptions,
		public resource: TrxParticipantResource,
	) { }

	public async update(record: TrxRecord, fromKey?: string): Promise<void> {
		if (fromKey) {
			await this.state.setPeerRecord(fromKey, record);
		}

		// Load the prior known state of the record from state
		const prior = await this.state.getRecord(record.transactionCode);
		try {
			// TODO: if expired, still propagate (and sign as failed)
			const merged = await this.validateAndMerge(prior, record);
			const recordState = await this.getRecordState(merged);
			switch (recordState) {
				case RecordState.ourPromiseNeeded: {
					const { member, links } = await this.findOurMember(merged);
					await this.resource.promise(member, links, merged);
					const modified = await this.addOurPromise(merged);
					await this.state.setRecord(modified);
					await this.pushModified(modified);
				} break;
				case RecordState.ourCommitNeeded: {
					const modified = await this.addOurCommit(merged);
					if (isConsensus(modified.commits.filter(c => c.type === SignatureTypes.commit).length, getReferees(modified).length)) {
						await this.releaseResources(true, modified);
					}
					await this.state.setRecord(modified);
					await this.pushModified(modified);
				} break;
				default: {
					if (!recordsEqual(merged, prior)) {
						if (await this.resource.isHeld(merged) && (recordState === RecordState.consensus || recordState === RecordState.rejected)) {
							await this.releaseResources(recordState === RecordState.consensus, merged);
						}
						await this.state.setRecord(merged);
						await this.pushModified(merged);
					}
				}
			}
		}
		catch (err) {
			await this.state.logInvalid(record, err);
			throw err;
		}
	}

	private async releaseResources(isSuccess: boolean, record: TrxRecord) {
		const { member, links } = await this.findOurMember(record);
		await this.resource.release(isSuccess, member, links, record);
	}

	private async findOurMember(record: TrxRecord) {
		const ourKey = this.state.publicKey;
		return {
			// Our member in the topology
			member: record.topology.members[ourKey],
			// Incoming and outgoing links to our member
			links: Object.entries(record.topology.links).filter(([, l]) => l.target === ourKey || l.source === ourKey)
				.map(([nonce, link]) => ({ nonce, link }))
		};
	}

	private async pushModified(record: TrxRecord) {
		const reachablePeers = await this.reachablePeers(record);
		const updates = reachablePeers.map(async key => {
			const peerRecord = await this.state.getPeerRecord(key, record.transactionCode);
			if (!peerRecord || !recordsEqual(peerRecord, record)) {
				await this.pushPeerRecord(key, record);
			}
		});
		await Promise.allSettled(updates);
		// TODO: put into Pending objects to monitor and log
	}

	private async pushPeerRecord(key: string, record: TrxRecord) {
		await this.options.updatePeer(key, record);
		await this.state.setPeerRecord(key, record);
	}

	private async reachablePeers(record: TrxRecord) {
		const ourKey = this.state.publicKey;
		// Members that aren't us, but have a physical address
		return Object.entries(record.topology.members).filter(([k, m]) => k !== ourKey && hasPhysical(m.address)).map(([k]) => k)
			// union - Members linked from our member
			.concat(Object.entries(record.topology.links).filter(([, l]) => l.source === ourKey).map(([, l]) => l.target))
			// union - Members linked to our member
			.concat(Object.entries(record.topology.links).filter(([, l]) => l.target === ourKey).map(([, l]) => l.source));
	}

	private async addOurCommit(record: TrxRecord) {
		const approved = !this.cryptoHash.isExpired(record.transactionCode)
			&& !this.cryptoHash.isExpired(record.sessionCode)
			&& await this.resource.shouldCommit(record);
		const sigType = approved ? SignatureTypes.commit : SignatureTypes.noCommit;
		const digest = getCommitDigest(record, [sigType.toString()]);
		const ourKey = this.state.publicKey;
		const modified = {
			...record,
			commits: [...record.commits, { type: sigType, key: ourKey, value: await this.vault.sign(digest) }]
		};
		return modified;
	}

	private async addOurPromise(record: TrxRecord) {
		const approved = !this.cryptoHash.isExpired(record.transactionCode)
			&& !this.cryptoHash.isExpired(record.sessionCode)
			&& await this.resource.shouldPromise(record);
		const sigType = approved ? SignatureTypes.promise : SignatureTypes.noPromise;
		const digest = getPromiseDigest(record, [sigType.toString()]);
		const ourKey = this.state.publicKey;
		const modified = {
			...record,
			promises: [...record.promises, { type: sigType, key: ourKey, value: await this.vault.sign(digest) }]
		};
		return modified;
	}

	async validateAndMerge(prior: TrxRecord, record: TrxRecord) {
		if (!prior) {
			await this.validateNew(record);
			return record;
		} else {
			this.validateUpdate(prior, record);
			return { ...prior, ...record, promises: mergeSignatures(prior.promises, record.promises), commits: mergeSignatures(prior.commits, record.commits) }
		}
	}

	validateUpdate(prior: TrxRecord, record: TrxRecord) {
		if (record.transactionCode != prior.transactionCode) throw new Error("Transaction code mismatch");
		if (record.sessionCode != prior.sessionCode) throw new Error("Session code mismatch");
		if (JSON.stringify(record.payload) != JSON.stringify(prior.payload)) throw new Error("Payload mismatch");
		if (JSON.stringify(record.topology) != JSON.stringify(prior.topology)) throw new Error("Topology mismatch");
	}

	async validateNew(record: TrxRecord) {
		// Verify that the transaction code is random enough
		if (!this.cryptoHash.isValid(record.transactionCode)) {
			throw new Error(`Transaction code is invalid`);
		}

		// Verify that the session code is random enough
		if (!this.cryptoHash.isValid(record.sessionCode)) {
			throw new Error(`Session code is invalid`);
		}

		// TODO: ensure that intents span plan(s)
		// TODO: ensure that terms match across plan(s)
		// TODO: ensure that we are still amenable to terms and intents
	}

	async getRecordState(record: TrxRecord): Promise<RecordState> {
		const participants = getParticipants(record);
		// No duplicate promise signatures should be present
		if (record.promises.length !== new Set(record.promises.map(p => p.key)).size) throw new Error(`Duplicate promise signatures present`);
		// Any promise signatures should be for participants
		if (record.promises.some(p => !participants.includes(p.key))) throw new Error(`Promise signature is not for a participant`);
		// Validate all present promise signatures
		const promiseDigest = getPromiseDigest(record);
		record.promises.forEach(p => {
			if (!this.verifyDigest(p.key, promiseDigest, p.value)) throw new Error(`Promise signature for ${p.key} is invalid`);
		});

		// Are there any rejected or invalid promises?
		const rejected = record.promises.filter(p => p.type !== SignatureTypes.promise);
		if (rejected.length) {
			return RecordState.rejected;
		}

		// Is our promise needed?
		const ourKey = this.state.publicKey;
		if (participants.includes(ourKey) && !record.promises.some(p => p.key === ourKey)) {
			return RecordState.ourPromiseNeeded;
		}

		// Are we still waiting on all promises?
		if (!participants.every(p => record.promises.some(s => s.key === p))) {
			if (record.commits.length !== 0) throw new Error(`Commit signatures present on un-promised transaction`);
			return RecordState.promising;
		}

		// No duplicate commit signatures should be present
		if (record.commits.length !== new Set(record.commits.map(p => p.key)).size) throw new Error(`Duplicate commit signatures present`);

		const referees = getReferees(record);
		// Commit signatures should be for a referee
		if (record.commits.some(p => !referees.includes(p.key))) throw new Error(`Commit signature is not for a referee`);

		// Validate all present commit signatures
		const commitDigest = getCommitDigest(record);
		record.commits.forEach(p => {
			if (!this.verifyDigest(p.key, commitDigest, p.value)) throw new Error(`Commit signature for ${p.key} is invalid`);
			if (p.type !== SignatureTypes.commit && p.type !== SignatureTypes.noCommit) throw new Error(`Invalid commit signature type for ${p.key}`);
		});

		// Is there a rejection majority?
		const rejectedCommits = record.commits.filter(p => p.type === SignatureTypes.noCommit);
		if (isConsensus(rejectedCommits.length, referees.length)) {
			return RecordState.rejected;
		}

		// Is our commit needed?
		if (referees.includes(ourKey) && !record.commits.some(p => p.key === ourKey)) {
			return RecordState.ourCommitNeeded;
		}

		const successfulCommits = record.commits.filter(c => c.type === SignatureTypes.commit);
		if (isConsensus(successfulCommits.length, referees.length)) {
			return RecordState.consensus;
		}

		return RecordState.propagating;
	}

	/** validates that the signature of the digest is a valid signature from given public key */
	verifyDigest(key: string, digest: string, signature: string): Promise<boolean> {
		return this.asymmetric.verifyDigest(base64ToArray(key), base64ToArray(digest), base64ToArray(signature));
	}
}

function isConsensus(n: number, total: number) {
	return n >= Math.ceil(total / 2);
}

function getParticipants(record: TrxRecord) {
	return Object.entries(record.topology.members).filter(([, member]) => member.types.includes(MemberTypes.participant)).map(([k]) => k);
}

function getReferees(record: TrxRecord) {
	return Object.entries(record.topology.members).filter(([, member]) => member.types.includes(MemberTypes.referee)).map(([k]) => k);
}

function createDigest(trx: TrxRecord, additionalData: string[] = []) {
	const hash = crypto.createHash('sha256');
	hash.update(trx.transactionCode);
	hash.update(trx.sessionCode);
	hash.update(JSON.stringify(trx.payload));
	hash.update(JSON.stringify(trx.topology));

	additionalData.forEach(data => {
		hash.update(data);
	});

	return hash.digest('base64');
}

function recordsEqual(a: TrxRecord | undefined, b: TrxRecord | undefined) {
	return !a && !b
		|| (
			a && b
				&& a.transactionCode === b.transactionCode && a.sessionCode === b.sessionCode
				&& JSON.stringify(a.payload) === JSON.stringify(b.payload)
				&& JSON.stringify(a.topology) === JSON.stringify(b.topology)
				&& (a.commits?.length ?? 0) === (b.commits?.length ?? 0)
				&& (a.promises?.length ?? 0) === (b.promises?.length ?? 0)
				&& a.commits.every((c, i) => c.key === b.commits[i].key && c.type === b.commits[i].type && c.value === b.commits[i].value)
				&& a.promises.every((c, i) => c.key === b.promises[i].key && c.type === b.promises[i].type && c.value === b.promises[i].value)
		);
}

function getPromiseDigest(trx: TrxRecord, additionalData: string[] = []) {
	return createDigest(trx, additionalData);
}

function getCommitDigest(trx: TrxRecord, additionalData: string[] = []) {
	const adds = trx.promises.map(p => JSON.stringify(p));
	return createDigest(trx, [...adds, ...additionalData]);
}

function mergeSignatures(sigs1: Signature[], sigs2: Signature[]) {
	const candidates = [...sigs1];
	sigs2.forEach(p => {
		const index = candidates.findIndex(s => s.key == p.key);
		if (index >= 0) {
			const match = candidates[index];
			if (match.value !== p.value || match.type !== p.type) throw new Error(`Signature or type for ${p.key} has changed`);
			candidates.splice(index, 1);
		}
	});
	return [...candidates, ...sigs2];
}

function hasPhysical(address: string | undefined): boolean {
	// TODO: distinguish between logical only and physical addresses
	return Boolean(address) && address!.length > 0;
}

