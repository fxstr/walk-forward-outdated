import runAlgorithms from './runAlgorithms';


/**
 * As we need to share onNewInstrument (and maybe more later) on both runThrough and rejectOnFalse,
 * use a central factory function.
 */
function createReturnObject(algos, halt) {
	return {
		async onClose(...params) {
			return await runAlgorithms(params, algos, 'onClose', !!halt);	
		},
		async onNewInstrument(instrument) {
			callFunction(algos, 'onNewInstrument', [instrument]);
		},
		setBacktest(backtest) {
			callFunction(algos, 'setBacktest', [backtest]);
		}
	};
}


/**
 * When some functions are called, we need to pass them to all child runners of the current runner
 * function. To do so, we have to check if the child runner has the function and then call it.
 * @param  {array} algos         Algorithms to call
 * @param  {string} functionName Function to check and call
 * @param  {array} params        Parameters to call algo[functionName] with
 */
function callFunction(algos, functionName, params) {
	algos.forEach((algo) => {
		if (algo[functionName] && typeof algo[functionName] === 'function') {
			algo[functionName](...params);
		}
	});
}


/**
* We use runThrough() as an algorithm runner which executes all algorithms or other runThrough() or
* rejectOnFalse() functions passed. It does *not* halt if an algorithm returns false.
* As serial() is executed directly when algorithms are set (backtest.setStrategies()), we let it 
* return an object with an onClose method that does all calculations when explicitly called (through
* backtest.run()).
* @params {object}					Either an algorithm (instantiated Algorithm class with an 
*									onClose onClose method) or another runThrough/haltOnFalse. Pass 
*									as many arguments as you like.
* @returns {object}					An object with an onClose method; whenever it is called, 
*									runAlgorithms() will be run with the parameters provided.
*/
function runThrough(...algorithms) {
	return createReturnObject(algorithms);
}



/**
* See runThrough. Difference: If an algorigthm returns false, rejectOnFalse halts and returns 
* original data.
* @params {object}					Either an algorithm (instantiated Algorithm class with an onClose
*									onClose method) or another runThrough/haltOnFalse. Pass as many 
*									arguments as you like.
* @returns {object}					An object with an onClose method; whenever it is called, 
*									runAlgorithms() will be run with the parameters provided.
*/
function rejectOnFalse(...algorithms) {
	return createReturnObject(algorithms, true);
}



export { rejectOnFalse, runThrough };
