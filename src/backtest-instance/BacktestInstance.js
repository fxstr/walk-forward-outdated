import debug from 'debug';
import mergeOrders from './mergeOrders';
import executeOrders from './executeOrders';
import DataSeries from '../data-series/DataSeries';
import calculatePositionsValues from './calculatePositionsValues';
const log = debug('WalkForward:BacktestInstance');

/**
* Instance of a backtest that runs a backtest with certain parameters. 
* Starts the backtest, executes the orders – does the actual trading.
*/
export default class BacktestInstance {

	/**
	* We store the amount of instruments we're holding on the instrument itself; to do so without
	* clashing with existing keys, we use a symbol (the same symbol for all instruments).
	* @private
	*/
	dataSeriesSizeKey = Symbol();

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
	* @πaram {BacktestInstruments} instruments			Instruments to run backtest on.
	* @param {object} runner							Object with an onClose method (and maybe 
	*                              						others). onClose takes current instruments, 
	*													orders etc. and returns updated orders.
	* @param {Map<string, function>} backtestConfig		Backtest configuration (to calculate
	*													commission, set default cash amount etc.)
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
		this.instruments.on('close', this.handleClose.bind(this));
		this.instruments.on('afterClose', this.handleAfterClose.bind(this));
		this.instruments.on('afterOpen', this.handleAfterOpen.bind(this));
		this.instruments.on('newInstrument', this.handleNewInstrument.bind(this));
		await this.instruments.run();
		log('Account is %o', this.accounts.data);
	}




	/**
	* Handles the close event of an instrument, runs all runners and updates orders
	* @private
	*/
	async handleClose(data) {

		// Update account values on runners (before calling our onClose runner)
		const orders = await this.runner.onClose(this.orders, data.instrument, 
			this.instruments.instruments, this);
		this.validateOrders(orders);

		// Update orders *after* they were checked
		this.orders = orders;

		log('Handle close for %s on %s; we got %d orders', data.instrument.name, data.data.date, 
			this.orders.length);

	}


	async handleNewInstrument(instrument) {
		if (this.runner.onNewInstrument && typeof this.runner.onNewInstrument === 'function') {
			log('Call onNewInstrument on runner, instrument is %o', instrument);
			this.runner.onNewInstrument(instrument);
		}
	}


	/**
	* Checks if the orders array contains valid entries
	* @param {array} orders			Orders to check
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
	 * @param  {Instrument[]} data 		Instruments that were closed
	 * @private
	 */
	handleAfterClose(data) {
		const currentDate = data[0].head().get('date');
		log('Close with %o', data);

		// Create Map of prices for instruments that just opened to simplify things
		const prices = data.reduce((prev, instrument) => {
			return prev.set(instrument, instrument.head().get('close')) && prev;
		}, new Map());

		// this.positions.head() will always return something, as open was called first
		const updatedPositions = calculatePositionsValues(this.positions.head(), prices);
		log('Updated positions for close are %o', updatedPositions);

		// Always add positions, even if they're empty
		this.positions.add(currentDate, updatedPositions);

		// Update account
		const newValue = Array.from(updatedPositions.values())
			.reduce((prev, position) => prev + position.value, 0);
		log('New invested value after close is %d', newValue);
		this.accounts.add(currentDate, new Map([
			['invested', newValue], 
			// Cash doesn't change, we're not trading on close
			['cash', this.accounts.head().get('cash')],
		]));

	}


	/**
	* Handles the open event of an instrument, executes orders
	* @param {array} data		Array of instruments that were just opened. Access value via 
	*                      		instrument.head().get('open')
	* @private
	*/
	handleAfterOpen(data) {

		const currentDate = data[0].head().get('date');
		log('Handle after open for %o', data);
		log('Handle afterOpen for %s on %s', data.map((instrument) => instrument.name).join(', '),
			currentDate);

		// Create Map of prices for instruments that just opened to simplify things
		const prices = data.reduce((prev, instrument) => {
			return prev.set(instrument, instrument.head().get('open')) && prev;
		}, new Map());

		// Update all positions values
		const recalculatedPositions = calculatePositionsValues(this.positions.head() || new Map(), 
			prices);

		// Merge all orders (one instrument might have multiple orders; merge them into one single
		// order)
		const mergedOrders = mergeOrders(this.orders);

		const account = this.accounts.head() || this.createAccount();
		const newPositions = executeOrders(recalculatedPositions, mergedOrders, prices, 
			account.get('cash'));

		// Always add positions, even if they're empty
		log('New positions are %o', newPositions);
		this.positions.add(currentDate, newPositions);

		// Get values to update account
		const middleValue = Array.from(recalculatedPositions.values())
			.reduce((prev, position) => prev + position.value, 0);
		const newValue = Array.from(newPositions.values())
			.reduce((prev, position) => prev + position.value, 0);

		// Cash gain/loss is the difference between the value of all positions before and after
		// we trade
		const newCash = account.get('cash') + (middleValue - newValue);
		const newAccountValues = new Map([
			['invested', newValue], 
			['cash', newCash],
		]);
		log('Account now has cash %d and invested %d', newCash, newValue);
		this.accounts.add(currentDate, newAccountValues);

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

