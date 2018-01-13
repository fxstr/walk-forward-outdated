import DataGenerator from '../data-generator/DataGenerator';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import debug from 'debug';
import dataSortFunction from './dataSortFunction';
const log = debug('WalkForward:Backtest');

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
	*/
	dataGenerator;

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
	* Runs the backtest
	*/
	run() {

		if (!this.strategyFunction) {
			throw new Error(`Backtest: You can only run a backtest after having added one or
				more strategies. Use the setStrategies() method to do so.`);
		}

		const results = this.strategyFunction();
		log('Results from backtest.run are %o', results);

	}

}