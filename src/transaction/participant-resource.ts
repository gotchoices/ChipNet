import { Nonce } from "../types";
import { TrxRecord } from "./record";
import { Link } from "../topology";
import { Member } from "../member";

export interface TrxLink {
	nonce: Nonce;
	link: Link;
}

export interface TrxParticipantResource {
	/** Preliminary (policy based) validation of the record */
	shouldPromise?: (member: Member, inLink: TrxLink | undefined, outLink: TrxLink | undefined, record: TrxRecord) => Promise<boolean>;
	/** Actually hold resources for this transaction - should throw exception if fails */
	promise: (member: Member, inLink: TrxLink | undefined, outLink: TrxLink | undefined, record: TrxRecord) => Promise<void>;
	/** Whether this node should commit to the transaction */
	shouldCommit?: (member: Member, inLink: TrxLink | undefined, outLink: TrxLink | undefined, record: TrxRecord) => Promise<boolean>;
	/** Commit or rollback transaction */
	release: (isSuccess: boolean, member: Member, inLink: TrxLink | undefined, outLink: TrxLink | undefined, record: TrxRecord) => Promise<void>;
}
