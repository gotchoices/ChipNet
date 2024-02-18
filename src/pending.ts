export class Pending<T> {
	response?: T;
	error?: unknown;

	get isResponse(): boolean {
		return this.response !== undefined;
	}

	get isError(): boolean {
		return this.error !== undefined;
	}

	get isComplete(): boolean {
		return this.isResponse || this.isError;
	}

	async result(): Promise<T> {
		if (this.isResponse) {
			return this.response!;
		}
		if (this.isError) {
			throw this.error!;
		}
		return await this.promise;
	}

	constructor(
		public promise: Promise<T>
	) {
		promise.then(response => {
			this.response = response;
		}, error => {
			this.error = error;
		});
	}
}
