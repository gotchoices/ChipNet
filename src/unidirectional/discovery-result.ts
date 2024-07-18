import { Plan } from "../plan";

export interface DiscoveryResult {
	sessionCode: string;
	plans: Plan[];
}
