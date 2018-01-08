export default class Backtest {

	/**
	* @private
	* Strategies to backtest
	*/
	strategies;

	setDataSource() {

	}


	/**
	* Defines the strategies to backtest
	* @param {function} callback		Callback that will be invoked when backtest is run; 
	*									arguments are values (one instance for every combination
	*									of the optimizations provided)
	*/
	setStrategies(callback) {
		this.strategies = callback;
	}


	/**
	* Runs the backtest
	*/
	run() {

		if (!this.strategies.length) {
			throw new Error(`Backtest: You can only run a backtest after having added one or
				more strategies; use the setStrategies() method to do so.`);
		}



	}

}