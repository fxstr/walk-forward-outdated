import logger from '../logger/logger';
const { debug } = logger('WalkForward:combineParameters');
/**
* Takes parameters as a Map in the form of: 
* const a = new Map();
* a.set('parameterA', [value1, value2]);
* a.set('parameterB', [value1, value2]);
* Then returns all possible parameter combinations as maps (written in object for the sake of
* simplicity) in an array:
* [{ parameterA: value1, parameterB: value1 }, { parameterA: value1, parameterB: value2 }
*  { parameterA: value2, parameterB: value1 }, { parameterA: value2, parameterB: value2 }]
* @param {Map} parameters			Parameters to combine. Key is param name, value is an array
*									of parameter values.
* @returns {Map[]}
*/

export default function combineParameters(parameters) {

	return Array.from(parameters).reduce((prev, item) => {
		const newParamCombinations = [];
		item[1].forEach((parameterValue) => {
			prev.forEach((existingParameter) => {
				const newCombination = new Map(existingParameter);
				newCombination.set(item[0], parameterValue);
				newParamCombinations.push(newCombination);
			});
		});
		debug('New parameter combinations are %o', newParamCombinations);
		return newParamCombinations;
	}, [new Map()]);

}


