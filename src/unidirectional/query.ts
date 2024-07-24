import { PublicTarget } from "../target";
import { Intents } from "../intent";

export interface UniQuery {
	/** Target address */
	target: PublicTarget;
	/** Hash code used to anonymize node links */
	sessionCode: string;
	/** Intended purpose(s) (comms, lifts, etc.) and related terms */
	intents: Intents;
}
