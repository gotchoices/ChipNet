/** 1 = Participant, 2 = Referee.  Node: All nodes can act as relays. */

export type MemberType = 'P' | 'R';
export const MemberTypes: Record<string, MemberType> = { participant: 'P', referee: 'R' } as const;

export interface MemberDetail {
	address?: string; // Logical and possibly physical address of member
	secret?: string; // Member managed encrypted path segment or other agent memory
	types: MemberType[];
}

export interface Member {
	key: string;
	detail: MemberDetail;
}
