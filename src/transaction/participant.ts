import { Asymmetric, AsymmetricVault, CryptoHash, base64ToArray } from "chipcryptbase";
import { DependentMember, Member, MemberTypes } from "../member";
import { TrxParticipantState } from "./participant-state";
import { recordsEqual, Signature, SignatureTypes, TrxRecord } from "./record";
import * as crypto from 'crypto';
import { TrxLink, TrxParticipantResource } from "./participant-resource";
import { Address, addressesMatch, findMembers } from "..";
import { deepEqual } from "../deep-equal";
import { hashDeep } from "../hash-deep";

enum RecordState {
	promising,
	ourPromiseNeeded,
	ourCommitNeeded,
	consensus,
	rejected,
	propagating,
}

export class TrxParticipant {
	constructor(
		public readonly state: TrxParticipantState,
		public readonly vault: AsymmetricVault,
		public readonly asymmetric: Asymmetric,
		public readonly cryptoHash: CryptoHash,
		public readonly updatePeer: (address: Address, record: TrxRecord) => Promise<void>,
		public readonly resource: TrxParticipantResource,
		public readonly nonceToLinkMap: Record<string, string> | undefined,
	) { }

	public async update(record: TrxRecord, fromAddress?: Address): Promise<void> {
		if (fromAddress) {
			// TODO: if this came from a peer that we just updated, we might be getting older information than what we just sent; assume the union or be conservative?
			await this.state.savePeerRecord(fromAddress, record);
		}

		// Load the prior known state of the record from state
		let prior = await this.state.getRecord(record);
		try {
			// TODO: if expired, still propagate (and sign as failed)
			let running: TrxRecord | undefined = await this.validateAndMerge(prior, record);
			if (recordsEqual(running, prior)) {	// If no changes, just propagate
				await this.pushModified(running);
			}
			else {
				await this.state.saveRecord(running);
				const ourMember = await this.findOurMember(running);
				if (!ourMember) {	// We are not in the topology - just propagate
					await this.pushModified(running);
					return;
				}
				while (running) {
					const modified = await this.advanceState(ourMember, running);
					if (modified) {
						await this.state.saveRecord(modified);
					}
					prior = running;
					running = modified;
				}
				if (prior) {
					await this.pushModified(prior);
				}
			}
		}
		catch (err) {
			await this.state.logInvalid(record, err);
			throw err;
		}
	}

	private async advanceState(ourMember: { member: Member; inLinks: TrxLink[]; outLinks: TrxLink[]; }, record: TrxRecord): Promise<TrxRecord | undefined> {
		const { member, inLinks, outLinks } = ourMember;
		const recordState = await this.getRecordState(record);
		switch (recordState) {
			case RecordState.ourPromiseNeeded: {
				await this.resource.promise(member, inLinks, outLinks, record);
				return await this.addOurPromise(member, inLinks, outLinks, record);
			}
			case RecordState.ourCommitNeeded: {
				return await this.addOurCommitOrReject(member, inLinks, outLinks, record);
			}
			default: {
				if ((recordState === RecordState.consensus || recordState === RecordState.rejected) && !(await this.state.getIsReleased(record.transactionCode))) {
					await this.releaseResource(recordState, member, inLinks, outLinks, record);
				}
			}
		}
	}

	private async releaseResource(recordState: RecordState, member: Member, inLinks: TrxLink[], outLinks: TrxLink[], record: TrxRecord) {
		try {
			await this.resource.release(recordState === RecordState.consensus, member, inLinks, outLinks, record);
		}
		catch (err) {
			void this.state.logReleaseError(record, err);
			throw err;
		}
		await this.state.setIsReleased(record.transactionCode);
	}

	private async findOurMember(record: TrxRecord): Promise<{ member: Member, inLinks: TrxLink[], outLinks: TrxLink[] } | undefined> {
		const ourAddress = this.state.self.address;
		const ourMembers = findMembers(record.topology, ourAddress);
		if (ourMembers.length === 0) return;
		if (ourMembers.length > 1) throw new Error(`Multiple members found for address ${JSON.stringify(ourAddress)}`);
		const inLinks = Object.entries(record.topology.links).filter(([, l]) => addressesMatch(l.target, ourAddress));
		const outLinks = Object.entries(record.topology.links).filter(([, l]) => addressesMatch(l.source, ourAddress));
		return {
			// Our member in the topology
			member: ourMembers[0].member,
			// Incoming and outgoing links to our member
			inLinks: inLinks.map(([nonce, link]) => ({ nonce, link, linkId: this.nonceToLinkMap?.[nonce] })),
			outLinks: outLinks.map(([nonce, link]) => ({ nonce, link, linkId: this.nonceToLinkMap?.[nonce] })),
		};
	}

	private async pushModified(record: TrxRecord) {
		const reachablePeers = await this.reachablePeers(record);
		const updates = reachablePeers.map(async address => {
			const peerRecord = await this.state.getPeerRecord(address, record.transactionCode);
			if (!peerRecord || !recordsEqual(peerRecord, record)) {
				await this.pushPeerRecord(address, record);
			}
		});
		await Promise.allSettled(updates);
		// TODO: put into Pending objects to monitor and log
	}

	private async pushPeerRecord(address: Address, record: TrxRecord) {
		try {
			await this.updatePeer(address, record);
		} catch (err) {
			await this.state.logUpdateError(record, address, err);
			await this.state.logUpdateError(record, address, err);
			return;
		}
		await this.state.savePeerRecord(address, record);
	}

	private async reachablePeers(record: TrxRecord): Promise<Address[]> {
		const ourAddress = this.state.self.address;
		// Members that aren't us, but have a physical address
		return record.topology.members.filter(m => !addressesMatch(m.address, ourAddress) && hasPhysical(m.physical)).map(({ address }) => address)
			// union - Members linked from our member
			.concat(Object.entries(record.topology.links).filter(([, l]) => addressesMatch(l.source, ourAddress)).map(([, l]) => l.target))
			// union - Members linked to our member
			.concat(Object.entries(record.topology.links).filter(([, l]) => addressesMatch(l.target, ourAddress)).map(([, l]) => l.source));
	}

	private async addOurCommitOrReject(member: Member, inLinks: TrxLink[], outLinks: TrxLink[], record: TrxRecord): Promise<TrxRecord> {
		const approved = !this.cryptoHash.isExpired(record.transactionCode)
			&& !this.cryptoHash.isExpired(record.sessionCode)
			&& this.resource.shouldCommit ? (await this.resource.shouldCommit(member, inLinks, outLinks, record)) : true;
		return await this.signCommit(approved, record);
	}

	private async signCommit(approved: boolean, record: TrxRecord) {
		const sigType = approved ? SignatureTypes.commit : SignatureTypes.noCommit;
		const digest = getCommitDigest(record, [sigType.toString()]);
		const address = this.state.self.address;
		const modified = {
			...record,
			commits: [...record.commits, { type: sigType, address, value: await this.vault.sign(digest) }]
		};
		return modified;
	}

	private async addOurPromise(member: Member, inLinks: TrxLink[], outLinks: TrxLink[], record: TrxRecord): Promise<TrxRecord> {
		const approved = !this.cryptoHash.isExpired(record.transactionCode)
			&& !this.cryptoHash.isExpired(record.sessionCode)
			&& this.resource.shouldPromise ? (await this.resource.shouldPromise(member, inLinks, outLinks, record)) : true;
		const sigType = approved ? SignatureTypes.promise : SignatureTypes.noPromise;
		const digest = getPromiseDigest(record, [sigType.toString()]);
		const address = this.state.self.address;
		const modified = {
			...record,
			promises: [...record.promises, { type: sigType, address, value: await this.vault.sign(digest) }]
		};
		return modified;
	}

	async validateAndMerge(prior: TrxRecord | undefined, record: TrxRecord) {
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
		if (!deepEqual(record.payload, prior.payload)) throw new Error("Payload mismatch");
		if (!deepEqual(record.topology, prior.topology)) throw new Error("Topology mismatch");
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
		if (record.promises.length !== new Set(record.promises.map(p => JSON.stringify(p.address))).size) throw new Error(`Duplicate promise signatures present`);
		// Any promise signatures should be for participants
		if (record.promises.some(p => !participants.some(par => addressesMatch(par.address, p.address)))) throw new Error(`Promise signature is not for a participant`);
		// Validate all present promise signatures
		const promiseDigest = getPromiseDigest(record);
		record.promises.forEach(p => {
			if (!this.verifyDigest(p.address.key, promiseDigest, p.value)) throw new Error(`Promise signature for ${JSON.stringify(p.address)} is invalid`);
		});

		// Are there any rejected or invalid promises?
		const rejected = record.promises.filter(p => p.type !== SignatureTypes.promise);
		if (rejected.length) {
			return RecordState.rejected;
		}

		// Is our promise needed?
		const address = this.state.self.address;
		if (participants.some(par => addressesMatch(par.address, address)) && !record.promises.some(p => addressesMatch(p.address, address))) {
			return RecordState.ourPromiseNeeded;
		}

		// Are we still waiting on all promises?
		if (!participants.every(par => record.promises.some(s => addressesMatch(s.address, par.address)))) {
			if (record.commits.length !== 0) throw new Error(`Commit signatures present on un-promised transaction`);
			return RecordState.promising;
		}

		// No duplicate commit signatures should be present
		if (record.commits.length !== new Set(record.commits.map(p => JSON.stringify(p.address))).size) throw new Error(`Duplicate commit signatures present`);

		const referees = getReferees(record);
		// Commit signatures should be for a referee
		if (record.commits.some(p => !referees.some(r => addressesMatch(p.address, r.address)))) throw new Error(`Commit signature is not for a referee`);

		// Validate all present commit signatures
		const commitDigest = getCommitDigest(record);
		record.commits.forEach(p => {
			if (!this.verifyDigest(p.address.key, commitDigest, p.value)) throw new Error(`Commit signature for ${JSON.stringify(p.address)} is invalid`);
			if (p.type !== SignatureTypes.commit && p.type !== SignatureTypes.noCommit) throw new Error(`Invalid commit signature type for ${JSON.stringify(p.address)}`);
		});

		// Is there a rejection majority?
		const rejectedCommits = record.commits.filter(p => p.type === SignatureTypes.noCommit);
		if (isConsensus(rejectedCommits.length, referees.length)) {
			return RecordState.rejected;
		}

		// Is our commit needed?
		if (referees.some(r => addressesMatch(r.address, address)) && !record.commits.some(c => addressesMatch(c.address, address))) {
			return RecordState.ourCommitNeeded;
		}

		// We've reached consensus
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

function getParticipants(record: TrxRecord): DependentMember[] {
	return record.topology.members.filter(member => member.types.includes(MemberTypes.participant));
}

function getReferees(record: TrxRecord): DependentMember[] {
	return record.topology.members.filter(member => member.types.includes(MemberTypes.referee));
}

function createDigest(trx: TrxRecord, additionalData: string[] = []) {
	const hash = crypto.createHash('sha256');
	hash.update(trx.transactionCode);
	hash.update(trx.sessionCode);
	hashDeep(hash, trx.payload);
	hashDeep(hash, trx.topology);

	additionalData.forEach(data => {
		hash.update(data);
	});

	return hash.digest('base64');
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
		const index = candidates.findIndex(s => addressesMatch(s.address, p.address));
		if (index >= 0) {
			const match = candidates[index];
			if (match.value !== p.value || match.type !== p.type) throw new Error(`Signature or type for ${JSON.stringify(p.address)} has changed`);
			candidates.splice(index, 1);
		}
	});
	return [...candidates, ...sigs2];
}

function hasPhysical(address: string | undefined): boolean {
	return Boolean(address) && address!.length > 0;
}

