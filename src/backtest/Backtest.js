import DataGenerator from '../data-generator/DataGenerator';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import Optimization from '../optimization/Optimization';
import debug from 'debug';
import dataSortFunction from './dataSortFunction';
const log = debug('WalkForward:Backtest');

/**
* The main class which holds most functionality.
*/
export default class Backtest {

	/**
	* Strategies to backtest, wrapped in a function (which takes the optimization params as
	* an argument)
	* @private
	*/
	strategyFunction;

	/**
	* Source to read data from
	* @private
	*/
	dataSource;

	/**
	* Holds the instance of our data generator
	* @private
	*/
	dataGenerator;

	/**
	* Backtest facades Optimization – this.optimization holds the corresponding instance
	* @private
	*/
	optimization = new Optimization();

	/**
	* Define a data source; this might only be done once. DataSource must have a read method
	* which returns a promise that resolves to the data available (see CSVSource and 
	* BacktestCSVSource).
	* @param {object} source				Source to add
	* @param {function} source.read
	*/
	setDataSource(source) {

		if (this.dataSource) {
			throw new Error(`Backtest: You can only use the setDataSource method once; once your
				data source is set, you cannot change it.`);
		}

		if (!source || typeof source.read !== 'function') {
			throw new Error(`Backtest: when using setSource, pass an instance that has a read
				method.`);
		}

		this.dataSource = source;
		this.dataGenerator = new DataGenerator(this.dataSource, dataSortFunction);
		
		log('Set dataSource to %o, generator is %o', source, this.dataGenerator);

	}


	/**
	* Defines the strategies to backtest
	* @param {function} callback		Callback that will be invoked when backtest is run; 
	*									arguments are values (one instance for every combination
	*									of the optimizations provided)
	*/
	setStrategies(callback) {
		if (typeof callback !== 'function') {
			throw new Error(`Backtest: Method setStrategies only accepts a function which will
				be called with the current optimization parameters`);
		}
		this.strategyFunction = callback;
	}


	/**
	* Returns a generator wrapper around the data source that will be passed as the second parameter
	* to the run function. Emits 'data' and 'newInstrument' events whenever they occur, then awaits
	* callbacks.
	*/
	getInstruments() {
		if (!this.dataGenerator) {
			throw new Error(`Backtest: Use setDataSource(source) method to add a data source before 
				accessing instruments through getInstruments().`);
		}
		return new BacktestInstruments(this.dataGenerator.generateData.bind(this.dataGenerator));
	}


	/**
	* Adds a param that will be optimized. The default optimization type is logarithmic with a base 
	* of 1.618 (golden ratio).
	* @param {string} name			Name of the optimized parameter
	* @param {array} bounds			Array with two numbers: from and to
	* @param {integer} steps		Number of steps optimized parameter should take from {from}
	*								to {to}
	*/
	addOptimization(name, bounds, steps) {
		this.optimization.addParameter(name, bounds, steps);
	}


	/**
	* Runs the backtest
	*/
	run() {

		if (!this.strategyFunction) {
			throw new Error(`Backtest: You can only run a backtest after having added one or
				more strategies. Use the setStrategies() method to do so.`);
		}



		// Runs for every param combination possible
		//const parameters = 

		const results = this.strategyFunction({}, this.getInstruments());
		log('Results from backtest.run are %o', results);

	}

}

