import runAlgorithms from './runAlgorithms';

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
	return {
		async onClose(...params) {
			return await runAlgorithms(params, algorithms, 'onClose');
		}
	};
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
	return {
		async onClose(...params) {
			return await runAlgorithms(params, algorithms, 'onClose', true);
		}
	};
}

export { rejectOnFalse, runThrough };