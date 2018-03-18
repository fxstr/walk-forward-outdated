import debug from 'debug';
const log = debug('WalkForward:runAlgorithms.unit');

/**
* Setup test data that is reused in parallel, serial, run and runAlgorithms
*/
export default function setupTestData() {

	// Regular algorithm: Set name property on base to value, add 1 to all 
	// previously set values
	class Algorithm {
		constructor(name, value) {
			this.name = name;
			this.value = value;
		}
		onClose(base, addToValue) {
			// Add 1 to all previous algorithms to make sure execution order is correct
			Object.keys(base).forEach((key) => base[key]++);
			const newProp = { [this.name]: this.value + addToValue };
			return { ...base, ...newProp };
		}
	}

	// Algorithm with an async onClose() method
	class AsyncAlgorithm extends Algorithm {
		async onClose(base, addToValue) {
			await new Promise((resolve) => setTimeout(resolve, 20));
			const newProp = { [this.name]: this.value + addToValue };
			return { ...base, ...newProp };
		}
	}

	// Algorithm that just returns false
	class FalseAlgorithm extends Algorithm {
		async onClose() {
			const result = await new Promise((resolve) => setTimeout(() => resolve(false)), 20);
			log('result for FalseAlgorithm is %o', result);
			return result;
		}
	}

	const base = {};

	return { Algorithm, AsyncAlgorithm, FalseAlgorithm, base };

}