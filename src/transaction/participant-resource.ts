import { Nonce } from "../types";
import { TrxRecord } from "./record";
import { Link, Member } from "./topology";

export interface TrxParticipantResource {
	shouldPromise: (record: TrxRecord) => Promise<boolean>;
	promise: (member: Member, links: { nonce: Nonce; link: Link; }[], record: TrxRecord) => Promise<void>;
	isHeld: (merged: TrxRecord) => Promise<boolean>;
	shouldCommit: (record: TrxRecord) => Promise<boolean>;
	release: (isSuccess: boolean, member: Member, links: { nonce: Nonce; link: Link; }[], record: TrxRecord) => Promise<void>;
}
