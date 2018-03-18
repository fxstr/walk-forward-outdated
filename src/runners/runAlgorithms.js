import debug from 'debug';
const log = debug('WalkForward:runAlgorithms');

/**
* Does all the magic, really: 
* - Runs all passed algorithms with the passed parameters, awaits the result.
* - Algorithms need to have a method of name methodName that updates the orders/positions object 
*   passed as a parameter. 
* - Current data is fed to algorithms methodName() method as a parameter
* - If algorithm's methodName() method returns false and we're running in a rejectOnFalse (instead 
*   of a runThrough) mode, halt execution and return false. 
* @param {array} originalParams		Parameters to pass to algorithms; first param will be returned 
*									if haltOnFalse is false or haltOnFalse is true and none of the 
*									algos returns false.
* @param {array} algos				Algorithms to run params through
* @param {string} methodName		Method to call on all algos
* @param {boolean} haltOnFalse		Halts algorithm and returns false as soon as any executed
* 									algorithm returns false. 
* @returns {false|object}			If haltOnFalse is true and an algo returns false, return false;
*									else return the first parameter passed. Why? The return syntax
*									of runAlgos must be the same as for algos in order to be 
*									nestable. The returned value will be read by run() to make 
*									the corresponding orders. 
*									Possible alternatives: 
*									- Assume first param is always an array and replace its 
*									contents on false (against: very specific solution)
*									- Replace all params with their original value on false
*									(against: does not work with non-arrays and objects, i.e. 
*									structures that don't reference their content)
*/
export default async function runAlgorithms(originalParams, algos, methodName, haltOnFalse) {
	
	// Check parameters
	// Params: Array
	if (!originalParams || !Array.isArray(originalParams)) throw new Error(`runAlgorithms: 
		First argument must be an array of parameters to pass to the algorithms provided.`);
	// Algos: Array
	if (!algos || !Array.isArray(algos)) throw new Error(`runAlgorithms: Second argument 
		must be an array of algorithms.`);
	// Method name: String
	if (!methodName || typeof methodName !== 'string') throw new Error(`runAlgos: Third argument 
		must be the method name (string) to call on every algo passed.`);

	// Clone original params as they will change (first item will be updated with the result
	// returned by algo)
	let params = [...originalParams];

	// Go through all algorithms and call every single one (until false/haltOnFalse was hit if 
	// haltOnFalse is set) with the parameters provided
	for (const algo of algos) {
		// Algo doesn't have method of name methodName
		if (!algo[methodName] || typeof algo[methodName] !== 'function') throw new Error(`
			runAlgorithms: Algorithm doesn't have a ${ methodName }() method.`);

		log('Run algorithm %o with params %o', algo, params);
		const result = await algo[methodName](...params);
		// Update params: First item is the result returned by algo, following items stay the same
		params = [result, ...params.slice(1)];
		log('Result for algorithm %o is %o, new parameters are %o', algo, result, params);
		
		// If haltOnFalse was set, halt algorithms as soon as any algorithm's methodName method 
		// returns false and return false
		log('Result of %s() method is %o; haltOnFalse is %o', methodName, result, haltOnFalse);
		if (result === false && haltOnFalse) {
			// If runAlgorithms returns false, return false.
			return false;
		}
	}
	// Return first parameter passed (orders)
	return params[0];
}
