function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import logger from '../logger/logger';
import executeOrders from './executeOrders';
import DataSeries from '../data-series/DataSeries';
import Positions from '../positions/Positions';
import calculatePositionsValues from './calculatePositionsValues';
import { formatDate, formatInstruments, formatOrders, formatPositions } from '../helpers/formatLogs';
import executeAlgorithmsSerially from '../helpers/executeAlgorithmsSerially';
import Instrument from '../instrument/Instrument';
const log = logger('WalkForward:BacktestInstance');
/**
* Instance of a backtest that runs a backtest with certain parameters.
* Starts the backtest, executes the orders – does the actual trading.
*/

export default class BacktestInstance {
  /**
   * Orders: An array of orders, updated on close, executed on afterOpen and then cleared
   * (good for 1 day only)
   */

  /**
   * Positions: Current positions as a DataSeries, every instrument has its column, value is
   * the position size
   */

  /**
   * Account: Current cash and instrument values for every date, cols are cash, invested
   * later all fees, and every instrument
   */

  /**
   * Holds results of performanceIndicators if they are executed through
   * calculatePerformanceIndicators
   * @type {Map}
   */

  /**
  * @πaram {BacktestInstruments} instruments          Instruments to run backtest on.
  * @param {BacktestInstruments} instruments          Instruments that backtest is executed for
  * @param {objectt[]} algorithmStack                 Array of objects with handleOpen and
  *                                                   handleNewInstrument methods that are called
  *                                                   on corresponding events of instruments.
  * @param {Map<string, function>} backtestConfig     Backtest configuration (to calculate
  *                                                   commission, set default cash amount etc.)
  */
  constructor(instruments, algorithmStack, backtestConfig) {
    _defineProperty(this, "orders", []);

    _defineProperty(this, "positions", new Positions());

    _defineProperty(this, "accounts", new DataSeries());

    _defineProperty(this, "performanceResults", new Map());

    // No validation needed as this is a purely internal class
    log.debug('Initialize BacktestInstance for instruments %o', formatInstruments(Array.from(instruments.instruments.values)));
    this.instruments = instruments;
    this.algorithmStack = algorithmStack;
    this.config = backtestConfig;
  }
  /**
  * Sets up the handlers for every instrument and runs through the instruments
  */


  async run() {
    // Set backtest on every strategy provided
    await executeAlgorithmsSerially(this.algorithmStack, 'setBacktest', [this], true);
    this.instruments.on('newInstrument', async instrument => {
      await executeAlgorithmsSerially(this.algorithmStack, 'handleNewInstrument', [instrument], true);
    });
    this.instruments.on('close', async instruments => {
      const date = instruments.length && instruments[0].head().get('date');
      log.info('\n%s - - - - - - - - - - - -  CLOSE %s ', formatInstruments(instruments), formatDate(date)); // Update position values before getting orders – we want the accounts (e.g. invested)
      // be up to date when we access them in our orders algos.

      this.updatePositionValues(instruments);
      const orders = await executeAlgorithmsSerially(this.algorithmStack, 'handleClose', [new Map(), instruments], true, true); // Validate before logging (we need valid orders to log them!)

      this.validateOrders(orders);
      log.info('%s Orders returned by algos are %s', formatDate(date), formatOrders(orders));
      this.setOrders(orders);
    });
    this.instruments.on('open', instruments => {
      const date = instruments.length && instruments[0].head().get('date');
      log.info('\n%s - - - - - - - - - - - -  OPEN %s', formatDate(date), formatInstruments(instruments));
      this.executeOrders(instruments);
    });
    await this.instruments.run();
  }
  /**
   * When orders are created on handleClose of a runner, they must be passed to backtest to be
   * executed.
   * @param {Map} orders    Orders to execute
   * @private
   */


  setOrders(orders) {
    this.orders = orders;
  }
  /**
  * Checks if the orders array contains valid entries
  * @param {Map} orders         Orders to check; a Map with key: instrument and value: object
  *                             with properties size and instrument
  * @private
  */


  validateOrders(orders) {
    // Orders is not a Map
    if (!(orders instanceof Map)) {
      throw new Error(`BacktestInstance: orders returned is not a Map but ${JSON.stringify(orders)}`);
    } // Every order needs an instrument and a valid size


    for (const [instrument, order] of orders) {
      if (!(instrument instanceof Instrument)) {
        throw new Error(`BacktestInstance: Every order's key must be an instance of Instrument, is ${JSON.stringify(instrument)} instead.`);
      }

      if (!Object.prototype.hasOwnProperty.call(order, 'size')) {
        throw new Error(`BacktestInstance: Every order must have an size property; your order is ${JSON.stringify(order)} instead.`);
      }

      if (typeof order.size !== 'number') {
        throw new Error(`BacktestInstance: Every order's size property must be a number; your size is ${JSON.stringify(order.size)} instead.`);
      }
    }
  }
  /**
   * Handles afterClose: calculates value of positions depending on close value
   * @param  {Instrument[]} data      Instruments that were closed
   * @private
   */


  updatePositionValues(instruments) {
    const currentDate = instruments[0].head().get('date');
    const prices = this.getCurrentPrices(instruments, 'close'); // Make sure we only calculate values of acutal positions (and not the date or type field
    // that are also part of this.positions)

    const updatedPositions = calculatePositionsValues(this.positions.getPositions(this.positions.head()), prices); // Update account

    const newInvestedValue = Array.from(updatedPositions.values()).reduce((prev, position) => prev + position.value, 0);
    this.accounts.add(new Map([['date', currentDate], ['type', 'close'], // Cash doesn't change, we're not trading on close
    ['cash', this.accounts.head().get('cash')], ['invested', newInvestedValue]])); // Only update positions after we have calculated our new values

    updatedPositions.set('date', currentDate);
    updatedPositions.set('type', 'close');
    log.info('%s Updated positions values after close are %s', formatDate(currentDate), formatPositions(updatedPositions));
    log.info('%s Account: cash %d, invested %d, total %d', formatDate(currentDate), this.accounts.head().get('cash'), this.accounts.head().get('invested'), this.accounts.head().get('cash') + this.accounts.head().get('invested')); // Always update positions, even if they're empty. Add a new row with field type set to
    // 'close'

    this.positions.add(updatedPositions);
  }
  /**
  * Handles the open event of an instrument, executes orders
  * @param {Instrument[]} instruments       Array of instruments that were just opened. Access
  *                                         value via instrument.head().get('open')
  * @private
  */


  executeOrders(instruments) {
    const currentDate = instruments[0].head().get('date');
    log.info('%s Execute orders %s; instruments with data are %s', formatDate(currentDate), formatOrders(this.orders), formatInstruments(instruments));
    const prices = this.getCurrentPrices(instruments, 'open'); // Update all positions values

    const recalculatedPositions = calculatePositionsValues(this.positions.getPositions(this.positions.head()), prices);
    const account = this.accounts.head() || this.createAccount();
    const newPositions = executeOrders(recalculatedPositions, this.orders, prices, account.get('cash'));
    log.info('%s Old positions were %s, new are', formatDate(currentDate), formatPositions(this.positions.head() || new Map()), formatPositions(newPositions)); // Get values to update account
    // previousValue is the value of all positions (on afterOpen) before any new positions were
    // opened

    const previousValue = Array.from(recalculatedPositions.values()).reduce((prev, position) => prev + position.value, 0);
    const newInvested = Array.from(newPositions.values()).reduce((prev, position) => prev + position.value, 0); // Cash gain/loss is the difference between the value of all positions before and after
    // we trade

    const newCash = account.get('cash') + (previousValue - newInvested);
    const newAccountValues = new Map([['date', currentDate], ['type', 'open'], ['cash', newCash], ['invested', newInvested]]);
    log.info('%s Account: cash %d, invested %d, total %d', formatDate(currentDate), newCash, newInvested, newCash + newInvested);
    this.accounts.add(newAccountValues); // Always add positions, even if they're empty. Update newPositions only after we have
    // calculated values for cash & co (or the new properties will also be looped through).

    newPositions.set('date', currentDate);
    newPositions.set('type', 'open');
    this.positions.add(newPositions); // Delete all orders – they're good for 1 bar only

    this.setOrders(new Map());
  }
  /**
   * Calculate this instance's performance index results for every performance index passed
   * (see Backtest)
   * @param  {object[]} indicators Indicators to execute; has two methods:
   *                               - calculate()
   *                               - getName()
   * TODO: Write test case!
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
      prev.set(instrument, instrument.head().get(type));
      return prev;
    }, new Map());
  }
  /**
   * Creates (initial) account entry
   */


  createAccount() {
    return new Map([['cash', this.config && this.config.get('cash') || 0], ['invested', 0]]);
  }

}
//# sourceMappingURL=BacktestInstance.mjs.map