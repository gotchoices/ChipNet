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
	shouldPromise?: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<boolean>;
	/** Actually hold resources for this transaction - should throw exception if fails */
	promise: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<void>;
	shouldCommit?: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<boolean>;
	/** Commit or rollback transaction */
	release: (isSuccess: boolean, member: Member, links: TrxLink[], record: TrxRecord) => Promise<void>;
}
