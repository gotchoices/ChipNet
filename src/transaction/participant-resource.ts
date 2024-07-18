import { Nonce } from "../types";
import { TrxRecord } from "./record";
import { Link } from "../topology";
import { Member } from "../member";

export interface TrxLink {
	nonce: Nonce;
	link: Link;
}

export interface TrxParticipantResource {
	shouldPromise: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<boolean>;
	promise: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<void>;
	isHeld: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<boolean>;
	shouldCommit: (member: Member, links: TrxLink[], record: TrxRecord) => Promise<boolean>;
	release: (isSuccess: boolean, member: Member, links: TrxLink[], record: TrxRecord) => Promise<void>;
}
