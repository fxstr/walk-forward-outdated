import debug from 'debug';
import mergeOrders from './mergeOrders';
import executeOrders from './executeOrders';
import DataSeries from '../data-series/DataSeries';
import Instrument from '../instrument/Instrument';
import calculatePositionsValues from './calculatePositionsValues';
const log = debug('WalkForward:BacktestInstance');

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
    * @πaram {BacktestInstruments} instruments          Instruments to run backtest on.
    * @param {object} runner                            Object with an onClose method (and maybe 
    *                                                   others). onClose takes current instruments, 
    *                                                   orders etc. and returns updated orders.
    * @param {Map<string, function>} backtestConfig     Backtest configuration (to calculate
    *                                                   commission, set default cash amount etc.)
    */
    constructor(instruments, runner, backtestConfig) {
        // No validation needed as this is a purely internal class
        log('Initialize');
        this.instruments = instruments;
        this.runner = runner;
        this.config = backtestConfig;        
    }


    /**
    * Sets up the handlers for every instrument and runs through the instruments
    */
    async run() {
        log('Run; instruments are %o', this.instruments);
        // Set backtest on runner functions; will watch newInstrument and onClose
        if (typeof this.runner.setBacktest === 'function') this.runner.setBacktest(this);
        this.instruments.on('afterClose', this.handleAfterClose.bind(this));
        this.instruments.on('afterOpen', this.handleAfterOpen.bind(this));
        await this.instruments.run();
        log('Account is %o', this.accounts.data);
    }


    /**
     * When orders are created on onClose of a runner, they must be passed to backtest to be 
     * executed.
     * @param {array} orders    Orders to execute
     */
    setOrders(orders) {
        this.validateOrders(orders);
        // Update orders *after* they were checked
        this.orders = orders;
        log('Set orders to %o', orders);
    }


    /**
    * Checks if the orders array contains valid entries
    * @param {array} orders         Orders to check
    * @private
    */
    validateOrders(orders) {
        // Orders is not an array
        if (!Array.isArray(orders)) throw new Error(`BacktestInstance: your runner functions
            returned invalid orders, those must be an array.`);
        // Every order needs an instrument and a size
        orders.forEach((order) => {
            if (!order.hasOwnProperty('instrument') || !order.hasOwnProperty('size') || 
                isNaN(order.size)) {
                throw new Error(`BacktestInstance: Every order must have an instrument and a
                    size field which is a number; your order is ${ JSON.stringify(order) }`);
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
        log('Close with %o', data);

        // Create Map of prices for instruments that just opened to simplify things
        const prices = data.reduce((prev, instrument) => {
            // Use && prev to return prev
            return prev.set(instrument, instrument.head().get('close')) && prev;
        }, new Map());

        // Make sure we only calculate values of acutal positions (and not the date or type field
        // that are also part of this.positions)
        const updatedPositions = calculatePositionsValues(this.getRealPositionsOfPositionHead(), 
            prices);
        log(`updatedPositions after close are %o`, updatedPositions);

        // Update account
        const newValue = Array.from(updatedPositions.values())
            .reduce((prev, position) => prev + position.value, 0);
        log('New invested value after close is %d', newValue);
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
        log('Updated positions for close are %o', updatedPositions);

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
        log('Handle afterOpen for %s on %s', data.map((instrument) => instrument.name).join(', '),
            currentDate);

        // Create Map of prices for instruments that just opened to simplify things
        const prices = data.reduce((prev, instrument) => {
            // Use && prev to return prev
            return prev.set(instrument, instrument.head().get('open')) && prev;
        }, new Map());

        // Update all positions values
        const recalculatedPositions = calculatePositionsValues(
            this.getRealPositionsOfPositionHead(), prices);

        // Merge all orders (one instrument might have multiple orders; merge them into one single
        // order)
        const mergedOrders = mergeOrders(this.orders);

        const account = this.accounts.head() || this.createAccount();
        const newPositions = executeOrders(recalculatedPositions, mergedOrders, prices, 
            account.get('cash'));

        log(`New positions are %o, merged orders %o`, newPositions, mergedOrders);

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
        log('Account now has cash %d and invested %d', newCash, newInvested);
        this.accounts.add(newAccountValues);

        // Always add positions, even if they're empty. Update newPositions only after we have
        // calculated values for cash & co (or the new properties will also be looped through).
        newPositions.set('date', currentDate);
        newPositions.set('type', 'open');
        log('New positions are %o', newPositions);
        this.positions.add(newPositions);


        // Delete all orders – they're good for 1 bar only
        this.orders = [];

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

