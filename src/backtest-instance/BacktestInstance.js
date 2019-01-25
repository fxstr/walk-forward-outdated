import logger from '../logger/logger';
import mergeOrders from './mergeOrders';
import executeOrders from './executeOrders';
import DataSeries from '../data-series/DataSeries';
import Instrument from '../instrument/Instrument';
import calculatePositionsValues from './calculatePositionsValues';
import formatDate from '../helpers/formatDate';

const log = logger('WalkForward:BacktestInstance');
const { debug } = log;

/**
* Instance of a backtest that runs a backtest with certain parameters. 
* Starts the backtest, executes the orders – does the actual trading.
*/
export default class BacktestInstance {

    /**
     * Orders: An array of orders, updated on close, executed on afterOpen and then cleared
     * (good for 1 day only)
     */
    orders = [];

    /**
     * Positions: Current positions as a DataSeries, every instrument has its column, value is
     * the position size
     */
    positions = new DataSeries();
    
    /**
     * Account: Current cash and instrument values for every date, cols are cash, invested
     * later all fees, and every instrument
     */
    accounts = new DataSeries();


    /**
     * Holds results of performanceIndicators if they are executed through 
     * calculatePerformanceIndicators
     * @type {Map}
     */
    performanceResults = new Map();


    /**
    * @πaram {BacktestInstruments} instruments          Instruments to run backtest on.
    * @param {object} runner                            Object with an onClose method (and maybe 
    *                                                   others). onClose takes current instruments, 
    *                                                   orders etc. and returns updated orders.
    * @param {Map<string, function>} backtestConfig     Backtest configuration (to calculate
    *                                                   commission, set default cash amount etc.)
    */
    constructor(instruments, runner, backtestConfig) {
        // No validation needed as this is a purely internal class
        log.debug(
            'Initialize BacktestInstance for instruments %o, config %o',
            instruments,
            backtestConfig,
        );
        this.instruments = instruments;
        this.runner = runner;
        this.config = backtestConfig;        
    }


    /**
    * Sets up the handlers for every instrument and runs through the instruments
    */
    async run() {

        if (typeof this.runner.setBacktest === 'function') this.runner.setBacktest(this, true);

        if (typeof this.runner.onNewInstrument === 'function') {
            this.instruments.on('newInstrument', (instrument) => {
                log.info('New instrument:', instrument.name);
                this.runner.onNewInstrument(instrument);
            });
        }

        if (typeof this.runner.onClose === 'function') {
            this.instruments.on(
                'close',
                async (ev) => {
                    debug(
                        'Close event caught, event data is %o for instrument %s',
                        ev.data,
                        ev.instrument.name
                    );
                    // First param: orders (empty at the beginning), second param: instrument that 
                    // fired onClose
                    const orders = await this.runner.onClose(
                        // Make sure we pass in existing orders – or they will be lost!
                        this.orders,
                        ev.instrument,
                    );

                    if (!orders.length) {
                        log.info(
                            '%s: No orders for %s',
                            formatDate(ev.data.get('date')),
                            ev.instrument.name,
                        );
                    } else {

                        // Simplify orderrs and positions (for logging purposes only)
                        const positionsForLog = [...this.positions.head().entries()]
                            .filter(entry => entry[0] !== 'date' && entry[0] !== 'type')
                            .map(entry => `${entry[0].name}/${entry[1].size}`)
                            .join(', ');
                        const ordersForLog = orders.map(order => (
                            `${order.instrument.name}/${order.size}`
                        )).join(', ');

                        log.info(
                            '%s: Algos for instrument %s returned orders %o. Current positions are %o.',
                            formatDate(ev.data.get('date')),
                            ev.instrument.name,
                            ordersForLog,
                            positionsForLog,
                        );
                    }

                    this.addOrders(orders);

                }
            );
        }

        this.instruments.on('afterClose', this.handleAfterClose.bind(this));
        this.instruments.on('afterOpen', this.handleAfterOpen.bind(this));

        await this.instruments.run();
        debug('Account is %o', this.accounts.data);

    }


    /**
     * When orders are created on onClose of a runner, they must be passed to backtest to be 
     * executed.
     * @param {array} orders    Orders to execute
     * @private
     */
    setOrders(orders) {
        this.validateOrders(orders);
        // Update orders *after* they were checked
        this.orders = orders;
        log.info('Set orders to %o', this.orders);
    }


    addOrders(orders) {
        this.validateOrders(orders);
        this.orders = [...this.orders, ...orders];
        log.info('Added orders, are now %o', this.orders); 
    }

    /**
    * Checks if the orders array contains valid entries
    * @param {array} orders         Orders to check
    * @private
    */
    validateOrders(orders) {

        // Orders is not an array
        if (!Array.isArray(orders)) {
            throw new Error(
                `BacktestInstance: Your runner functions returned invalid orders, they must be an array, are ${JSON.stringify(orders)}.`);
        }

        // Every order needs an instrument and a valid size
        orders.forEach((order) => {
            if (!order.hasOwnProperty('instrument')) {
                throw new Error(`BacktestInstance: Every order must have an instrument property; your order is ${JSON.stringify(order)} instead.`);
            }

            if (!order.hasOwnProperty('size')) {
                throw new Error(`BacktestInstance: Every order must have an size property; your order is ${JSON.stringify(order)} instead.`);
            }

            if(isNaN(order.size)) {
                throw new Error(`BacktestInstance: Every order's size property must be a number; your size is ${JSON.stringify(order.size)} instead.`);
            }
        });

    }


    /**
     * Handles afterClose: calculates value of positions depending on close value
     * @param  {Instrument[]} data      Instruments that were closed
     * @private
     */
    handleAfterClose(data) {
        const currentDate = data[0].head().get('date');
        log.info('%o: After open', currentDate);

        const prices =  this.getCurrentPrices(data, 'close');

        // Make sure we only calculate values of acutal positions (and not the date or type field
        // that are also part of this.positions)
        const updatedPositions = calculatePositionsValues(
            this.getRealPositionsOfPositionHead(), 
            prices,
        );
        log.debug(
            `%s: Updated positions after close are %o`,
            formatDate(currentDate),
            updatedPositions,
        );

        // Update account
        const newValue = Array.from(updatedPositions.values())
            .reduce((prev, position) => prev + position.value, 0);
        debug('New invested value after close is %d', newValue);
        this.accounts.add(new Map([
            ['invested', newValue],
            ['date', currentDate],
            ['type', 'close'],
            // Cash doesn't change, we're not trading on close
            ['cash', this.accounts.head().get('cash')],
        ]));

        // Only update positions after we have calculated our new values
        updatedPositions.set('date', currentDate);
        updatedPositions.set('type', 'close');
        debug('Updated positions for close are %o', updatedPositions);

        // Always update positions, even if they're empty. Add a new row with field type set to
        // 'close'
        this.positions.add(updatedPositions);
    }


    /**
     * Returns columns of this.positions that are actual positions (and not type or date columns)
     * @return {Map}        Map with key: instrument and value: position object
     * @private
     */
    getRealPositionsOfPositionHead() {
        const realPositions = new Map();
        // If this.positions.head does not yet exist (first call of handleAfterOpen), return an 
        // empty map
        if (!this.positions.data.length) return realPositions;
        for (const [key, value] of this.positions.head()) {
            if (key instanceof Instrument) realPositions.set(key, value);
        }
        return realPositions;
    }


    /**
    * Handles the open event of an instrument, executes orders
    * @param {array} data       Array of instruments that were just opened. Access value via 
    *                           instrument.head().get('open')
    * @private
    */
    handleAfterOpen(data) {

        const currentDate = data[0].head().get('date');
        debug('Handle afterOpen for %s on %s', data.map((instrument) => instrument.name).join(', '),
            currentDate);

        log.info('%o: After open', currentDate);

        const prices = this.getCurrentPrices(data, 'open');

        // Update all positions values
        const recalculatedPositions = calculatePositionsValues(
            this.getRealPositionsOfPositionHead(), prices);

        // Merge all orders (one instrument might have multiple orders; merge them into one single
        // order)
        const mergedOrders = mergeOrders(this.orders);

        const account = this.accounts.head() || this.createAccount();
        const newPositions = executeOrders(
            recalculatedPositions,
            mergedOrders,
            prices, 
            account.get('cash'),
        );

        const ordersForLog = mergedOrders.map(order => ({
            instrument: order.instrument.name,
            size: order.size,
        }));
        log.info('Merged oders are %o, orders are %o', ordersForLog, this.orders);
        const positionsForLog = [];
        for (const [columnKey, columnValue] of newPositions) {
            positionsForLog.push({
                instrument: columnKey.name,
                position: columnValue.size
            });
        }
        log.info(
            '%s: New positions after open are %o',
            formatDate(currentDate),
            positionsForLog,
        );


        // Get values to update account
        // previousValue is the value of all positions (on afterOpen) before any new positions were 
        // opened
        const previousValue = Array.from(recalculatedPositions.values())
            .reduce((prev, position) => prev + position.value, 0);
        const newInvested = Array.from(newPositions.values())
            .reduce((prev, position) => prev + position.value, 0);

        // Cash gain/loss is the difference between the value of all positions before and after
        // we trade
        const newCash = account.get('cash') + (previousValue - newInvested);
        const newAccountValues = new Map([
            ['invested', newInvested], 
            ['date', currentDate],
            ['type', 'open'],
            ['cash', newCash],
        ]);
        debug('Account now has cash %d and invested %d', newCash, newInvested);
        this.accounts.add(newAccountValues);

        // Always add positions, even if they're empty. Update newPositions only after we have
        // calculated values for cash & co (or the new properties will also be looped through).
        newPositions.set('date', currentDate);
        newPositions.set('type', 'open');
        this.positions.add(newPositions);

        // Delete all orders – they're good for 1 bar only
        this.setOrders([]);

    }


    /**
     * Calculate this instance's performance index results for every performance index passed 
     * (see Backtest)
     * @param  {object[]} indicators Indicators to execute; has two methods:
     *                               - calculate()
     *                               - getName()
     */
    async calculatePerformanceIndicators(indicators) {
        for (const indicator of indicators) {
            const result = await indicator.calculate(this);
            this.performanceResults.set(indicator.getName(), result);
        }
    }


    /**
     * Gets most current prices for all instruments passed and returns them in a map (key: 
     * instrument, value: price)
     * @param  {array} instrument   Instruments to get prices from
     * @param  {string} type        Kind of price to get, either 'open' or 'close'
     * @return {Map}
     * @private
     */
    getCurrentPrices(instruments, type) {
        return instruments.reduce((prev, instrument) => {
            // Use && prev to return prev
            return prev.set(instrument, instrument.head().get(type)) && prev;
        }, new Map());
    }


    /**
     * Creates (initial) account entry
     */
    createAccount() {
        return new Map([
            ['cash', this.config && this.config.get('cash')() || 0],
            ['invested', 0]
        ]);
    }

}

