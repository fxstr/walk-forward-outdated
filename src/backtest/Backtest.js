import colors from 'colors';
import logger from '../logger/logger';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import BacktestInstance from '../backtest-instance/BacktestInstance';
import Optimization from '../optimization/Optimization';
import BacktestExporter from '../backtest-exporter/BacktestExporter';
import backtestConfigTemplate from '../backtest-config/backtestConfigTemplate.js';
import validateBacktestConfig from '../backtest-config/validateBacktestConfig.js';

const log = logger('WalkForward:Backtest');
const { debug } = log;

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
     * @private
     */
    performanceIndicators = [];

    /**
     * Holds backtest instances. Key is the parameter set used (, value the corresponding
     * BacktestInstance
     * @private
     */
    instances = new Map();

    /**
    * Backtest facades Optimization – this.optimization holds the corresponding instance
    * @private
    */
    optimization = new Optimization();

    /**
    * Sets configuration for backtest (commissions, initial cash etc.)
    * @param {Map<string, function>} backtestConfig     Configuration for the backtest; valid keys
    *                                                   are:
    *                                                   - cash (initial amount on cash account)
    */
    setConfiguration(backtestConfig) {
        this.configuration = validateBacktestConfig(backtestConfig, backtestConfigTemplate);
    }

    /**
     * Adds a performance indicator that will be applied to every backtestInstance
     * @param {object[]} indicators         An array containing objects with properties:
     *                                      - name: Name of the performance indicator
     *                                      - indicator: Indicator to execute, is an object with a
     *                                        method 'calculate' that takes a backtestInstance as an
     *                                        argument and returns the performance index's value
     */
    addPerformanceIndicators(...indicators) {
        indicators.forEach((indicator) => {
            if (!indicator.calculate || typeof indicator.calculate !== 'function') {
                throw new Error(`Backtest: Perofmance indicator provided does not contain a calculate method, calculated is ${indicator.calculate} instead.`);
            }
            if (!indicator.getName || typeof indicator.getName !== 'function' || typeof indicator.getName() !== 'string') {
                throw new Error(`Backtest: Performance indicator must have a getName method that returns the performance indicator's name (string), is ${indicator.getName}.`);
            }
            this.performanceIndicators.push(indicator);
        });
    }


    /**
    * Define a data source; this might only be done once. DataSource must have a read method
    * which returns a promise that resolves to the data available (see CSVSource and
    * BacktestCSVSource).
    * @param {class} source             Source to add
    * @param {function} source.read
    */
    setDataSource(source) {

        if (this.dataSource) {
            throw new Error('Backtest: You can only use the setDataSource method once; once your data source is set, you cannot change it.');
        }

        if (!source || typeof source.generate !== 'function') {
            throw new Error('Backtest: When using setSource, pass an object (instance) that has a generate method.');
        }

        this.dataSource = source;

    }


    /**
    * Defines the strategies to backtest
    * @param {function} callback        Callback that will be invoked when backtest is run;
    *                                   arguments are values (one instance for every combination
    *                                   of the optimizations provided)
    */
    setStrategy(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Backtest: Method setStrategies only accepts a function which will be called with the current optimization parameters');
        }
        this.strategyFunction = callback;
    }


    /**
    * Adds a param that will be optimized. The default optimization type is logarithmic.
    * @param {string} name          Name of the optimized parameter
    * @param {number[]} bounds      Array with two numbers: from and to
    * @param {integer} steps        Number of steps optimized parameter should take from {from}
    *                               to {to}
    */
    addOptimization(name, bounds, steps) {
        this.optimization.addParameter(name, bounds, steps);
    }



    /**
    * Runs the backtest
    */
    async run() {

        // If setConfig was not used, initialize configuration with default values
        if (!this.configuration) {
            this.configuration = validateBacktestConfig(new Map(), backtestConfigTemplate);
        }

        if (!this.strategyFunction) {
            throw new Error('Backtest: You can only run a backtest after having added one or more strategies. Use the setStrategy() method to do so.');
        }

        if (!this.dataSource) {
            throw new Error('Backtest: Data source missing. Use setDataSource(source) method to add a data source before running a backtest, it needs to have a generate() method that is a generator.');
        }

        const hasOptimizations = !!this.optimization.parameterConfigs.size;
        const parameterSets = hasOptimizations ? this.optimization.generateParameterSets() :
            [undefined];

        log.info(`Run backtest for ${parameterSets.length} parameter sets.`);
        for (const parameterSet of parameterSets) {

            log.info(`Current parameter set is ${parameterSet}.`);

            // Define INSIDE of parameter loop; as a BacktestInstrument emits open/close events,
            // it must be re-instantiated every single time we run a backtest instance. Caching, if
            // needed, is done within the data source.
            const instruments = new BacktestInstruments(
                this.dataSource.generate.bind(this.dataSource),
                this.configuration.get('startDate'),
                this.configuration.get('endDate'),
            );
            const parameterizedStrategyRunner = this.strategyFunction(parameterSet);

            if (!Array.isArray(parameterizedStrategyRunner)) {
                throw new Error(`Backtest: Strategy function must return an array, returned ${parameterizedStrategyRunner} instead.`);
            }

            const instance = new BacktestInstance(
                instruments,
                parameterizedStrategyRunner,
                this.configuration,
            );
            await instance.run();
            await instance.calculatePerformanceIndicators(this.performanceIndicators);

            this.instances.set(parameterSet, instance);
        }

        log.info(`${this.instances.size} instances were run successfully.`);
        return this.instances;

    }



    /**
     * Exports the backtest's data to the folder provided
     * @param {String} path         Path (folder) to export CSVs to. Make sure it exists before
     *                              calling save().
     */
    async save(path) {

        // Don't save before running
        if (!this.instances || !this.instances.size) {
            throw new Error('Backtest: You cannot save backtest data before running the backtest. Make sure you call run() first.');
        }
        const exporter = new BacktestExporter();
        await exporter.export(this.instances, path);

    }


}

