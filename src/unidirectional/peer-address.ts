import { MemberDetail } from "../member";
import { Address } from "../target";

export interface PeerAddress {
	address: Address;
	selfReferee: boolean; // Referee preferences of the peer
	otherMembers?: Record<string, MemberDetail>;
	linkId: string;
}
