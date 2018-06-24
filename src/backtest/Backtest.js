import debug from 'debug';
import colors from 'colors';
import DataGenerator from '../data-generator/DataGenerator';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import BacktestInstance from '../backtest-instance/BacktestInstance';
import Optimization from '../optimization/Optimization';
import dataSortFunction from '../data-sort-function/dataSortFunction';
import BacktestExporter from '../backtest-exporter/BacktestExporter';
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
	 * Holds performance indicators that should be applied to all backtestInstances
	 * @type {Array}
	 */
	performanceIndicators = [];

	/**
	 * Holds backtest instances. Key is the parameter set used, value the corresponding 
	 * BacktestInstance
	 * @type {Map}
	 */
	instances = new Map();

	/**
	* Backtest facades Optimization – this.optimization holds the corresponding instance
	* @private
	*/
	optimization = new Optimization();

	configuration = new Map([
		['cash', () => 100000]
	]);

	/**
	* Sets configuration for backtest (commissions, initial cash etc.)
	* @param {Map<string, function>} backtestConfig		Configuration for the backtest; valid keys
	*													are:
	*													- cash (initial amount on cash account)
	*/
	setConfiguration(backtestConfig) {
		const validKeys = ['cash'];
		
		// Not a map
		if (!(backtestConfig instanceof Map)) throw new Error(`Backtest: Single parameter passed
			to setConfiguration must be a Map, is ${ backtestConfig }.`);
		
		// Invalid keys (warning)
		Array.from(backtestConfig.keys()).forEach((key) => {
			if (validKeys.indexOf(key) === -1) console.log(colors.yellow(`WARNING: You passed a 
				config through Backtest.setConfiguration() that contains an unknown 
				key (${ key }).`));
		});


		// Valid keys, but value is not a function
		validKeys.forEach((key) => {
			// Key is not present: use default, no need to check value
			if (!backtestConfig.get(key)) return;
			if (typeof backtestConfig.get(key) !== 'function') throw new Error(`Backtest: 
				Configuration for ${ key } passed to Backtest.setConfiguration() must be a 
				function, is ${ typeof backtestConfig.get(key) }.`);
			// Add key to valid config
		});

		// Update this.configuration with valid keys
		validKeys.forEach((key) => {
			if (!backtestConfig.has(key)) return;
			this.configuration.set(key, backtestConfig.get(key));
		});

	}

	/**
	 * Adds a performance indicator that will be applied to every backtestInstance
	 * @param {object[]} indicators 		An array containing objects with properties:
	 *                                		- name: Name of the performance indicator
	 *                                		- indicator: Indicator to execute, is an object with a
	 *                                		  method 'calculate' that takes a backtestInstance as an 
	 *                                		  argument and returns the performance index's value
	 */
	addPerformanceIndicators(...indicators) {
		indicators.forEach((indicator) => {
			if (!indicator.calculate || typeof indicator.calculate !== 'function') {
				throw new Error(`Backtest: Perofmance indicator provided does not contain a 
					calculate property or calculate property is not a function: 
					${ indicator.calculate }`);
			}
			if (!indicator.getName || typeof indicator.getName() !== 'string') {
				throw new Error(`Backtest: Performance indicator must have a getName method that
					returns the performance indicator's name, is ${ indicator.getName }.`);
			}
			this.performanceIndicators.push(indicator);
		});
	}


	/**
	* Define a data source; this might only be done once. DataSource must have a read method
	* which returns a promise that resolves to the data available (see CSVSource and 
	* BacktestCSVSource). 
	* @param {class} source				Source to add
	* @param {function} source.read
	*/
	setDataSource(source) {

		if (this.dataSource) {
			throw new Error(`Backtest: You can only use the setDataSource method once; once your
				data source is set, you cannot change it.`);
		}

		if (!source || typeof source.read !== 'function') {
			throw new Error(`Backtest: When using setSource, pass an instance that has a read
				method.`);
		}

		this.dataSource = source;		
		log('Set dataSource to %o', source);

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
	* Adds a param that will be optimized. The default optimization type is logarithmic.
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
	async run() {

		if (!this.strategyFunction) {
			throw new Error(`Backtest: You can only run a backtest after having added one or
				more strategies. Use the setStrategies() method to do so.`);
		}

		// This is not a public method; test input/available data none the less (for unit tests).
		if (!this.dataSource) {
			throw new Error(`Backtest: Use setDataSource(source) method to add a data source before 
				running a backtest.`);
		}

		// Used for caching data. Because the user instantiates the source and passes the instance
		// to backtest, we can also not use the source multiple times (because it's an instance,
		// not the class)
		const generator = new DataGenerator(this.dataSource, dataSortFunction);

		const hasOptimizations = !!this.optimization.parameterConfigs.size;
		const parameterSets = hasOptimizations ? this.optimization.generateParameterSets() : 
			[undefined];

		for (const parameterSet of parameterSets) {

			// Define INSIDE of parameter loop; as a BacktestInstrument emits open/close events,
			// it must be re-instantiated every single time we run a backtest. Caching is done 
			// through DataGenerator 
			const generatorFunction = generator.generateData.bind(generator);
			log('generatorFunction is %o', generatorFunction);
			const instruments = new BacktestInstruments(generatorFunction, 	true);

			const parameterizedStrategyRunner = this.strategyFunction(parameterSet);

			const instance = new BacktestInstance(instruments, 
				parameterizedStrategyRunner, this.configuration);
			await instance.run();
			await instance.calculatePerformanceIndicators(this.performanceIndicators);

			this.instances.set(parameterSet, instance);
		}

		log('Run done: %o', this.instances);
		return this.instances;	

	}



	/**
	 * Exports the backtest's data to the folder provided
	 * @param {String} path			Path (folder) to export CSVs to. Make sure it exists before
	 *                        		calling save().
	 */
	async save(path) {

		// Don't save before running
		if (!this.instances || !this.instances.size) {
			throw new Error(`Backtest: You cannot save backtest data before running the backtest. 
				Make sure you call run() first.`);
		}

		const exporter = new BacktestExporter();
		await exporter.export(this.instances, path);

	}


}

