//import logger from '../logger/logger';
//const { debug } = logger('WalkForward:genereateParameters');

// Use golden ratio (1.618) as default – Math.E is too large
const goldenRatio = (1 + Math.sqrt(5))/2;

/**
* Returns an array with {steps} values ranging from {from} to {to} where the distance between every
* step is logarithmic with base {logBase}.
* @param {number} from				Lowest value
* @param {number} to				Highest value
* @param {number} steps				Number of steps to return from from to to, also the number of
*									items in the array that will be returned.
* @param {number} logBase			Logarithmic base for steps
* @returns {array}
*/
function generateLogarithmicParameters(from, to, steps, logBase = goldenRatio) {
	// Generate steps - 1 numbers with logBase «logBase» for power 1 to (steps + 1)
	const originalNumbers = Array.from(new Array(steps)).map((item, index) => {
		return Math.pow(logBase, index);
	});
	// Reduce (or expand) all steps by a ratio
	const reductionRatio = (to - from) / 
		(originalNumbers[originalNumbers.length - 1] - originalNumbers[0]);
	const result = originalNumbers.map((item) => {
		// Deduct reduction ratio because the first orignalNumber is 1, not 0
		return from + reductionRatio * item - reductionRatio;
	});
	return result;
}

export { generateLogarithmicParameters };