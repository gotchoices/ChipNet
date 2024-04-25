/** 1 = Participant, 2 = Referee.  Node: All nodes can act as relays. */

export type MemberType = 1 | 2;
export const MemberTypes: Record<string, MemberType> = { participant: 1, referee: 2 } as const;

export interface Member {
	address?: string; // Logical and possibly physical address of member
	secret?: string; // Member managed encrypted path segment or other agent memory
	types: MemberType[];
}
