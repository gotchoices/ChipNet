import { UniRequest } from "./request";
import { UniOriginatorState } from "./originator-state";
import { sequenceStep } from "../sequencing";
import { PrivateLink } from "../private-link";
import { Plan } from "../plan";

export class UniOriginator {
	constructor(
		private state: UniOriginatorState
	) { }

	async discover(): Promise<Plan[]> {
		// TODO: look for direct matches to peers first

		for (var i = await this.state.getDepth(); i <= this.state.options.maxDepth; i++) {
			if (!await this.advance(i)) {
				break;
			}
			var plans = await this.state.getPlans();
			if (plans.length > 0) {
				return await this.prependParticipant(plans);
			}
		}
		return [];
	}

	private async advance(depth: number): Promise<boolean> {
		await this.state.startStep(depth);

		if (!(await this.addAdvancableRequests())) {
			return false;
		}

		const baseTime = Math.max((depth - 1) * this.state.options.stepOptions.minTime, await this.state.getLastTime());
		const stepResponse = await sequenceStep(baseTime, await this.state.getOutstanding(), this.state.options.stepOptions);

		await this.state.completeStep(stepResponse);

		return true;
	}

	private async addAdvancableRequests() {
		const potentials =
			(await this.state.getPeerLinks())
				.map(async link => {
					if (await this.state.shouldAdvance(link.id)) {
						const request = await this.sendRequest(link);
						await this.state.addOutstanding(link.id, request);
						return true;
					} else {
						return false;
					}
				});
		const newRequests = (await Promise.all(potentials)).filter(Boolean); // Node: this isn't awaiting on the requests themselves, just the creation and tracking of the requests
		return Boolean(newRequests.length);
	}

	private async sendRequest(seg: PrivateLink) {
		const lastResponse = await this.state.getResponse(seg.id);
		const nonce = this.state.getNonce(seg.id);
		const participant = await this.state.getParticipant();
		return new UniRequest(seg.id,
			this.state.options.sendUni(
				seg.id,
				{
					// TODO: when we figure out reuse with participant for searching locally, use negotiateTerms here:
					path: [{ nonce, terms: seg.terms }],
					participants: [participant],
					externalReferees: this.state.options.externalReferees
				},
				this.state.query,
				lastResponse?.hiddenReentrance)
		);
	}

	private async prependParticipant(plans: Plan[]) {
		const participant = await this.state.getParticipant();
		return plans.map(p => ({ ...p, participants: [participant, ...p.participants] } as Plan));
	}
}
