import debug from 'debug';
import mergeOrders from './mergeOrders';
import sortOrdersBySizeChange from './sortOrdersBySizeChange';
const log = debug('WalkForward:BacktestInstanceRunner');

/**
* Instance of a backtest that runs a backtest with certain parameters. 
* Starts the backtest, executes the orders – does the actual trading.
*/
export default class BacktestInstanceRunner {

	/**
	* We store the amount of instruments we're holding on the instrument itself; to do so without
	* clashing with existing keys, we use a symbol (the same symbol for all instruments).
	* @private
	*/
	dataSeriesSizeKey = Symbol();

	/**
	* @πaram {BacktestInstruments} instruments		Instruments to run backtest on.
	* @param {object} runnerFunction				Object with an onClose property that is a
	*												function which creates (and returns) orders.
	* @param {TransformableDataSeries} accounts		Data series (account values) to execute 
	*												transformations on, e.g. from cash to slippage
	*												or margin to cash.
	* @param {Map} backtestConfig					Backtest configuration (to calculate commission 
	*/
	constructor(instruments, runnerFunction, accounts, backtestConfig = new Map([
			['commission', () => 0]
		])) {
		
		// Validate arguments
		if (!instruments || !instruments.run || typeof instruments.run !== 'function') {
			throw new TypeError(`BacktestInstanceRunner: First argument needs a run method (e.g. an 
				instance of BacktestInstruments).`);
		}
		if (typeof runnerFunction !== 'function') throw new TypeError(`BacktestInstanceRunner: 
			Second argument must be a function.`);
		if (!accounts || !accounts.set || !accounts.add || typeof accounts.set !== 'function' ||
			typeof accounts.add !== 'function') throw new TypeError(`BacktestInstanceRunner: 
			Third argument must contain a set and add method (e.g. a TransformableDataSeries.`);
		if (!(backtestConfig instanceof Map)) throw new TypeError(`BacktestInstanceRunner: 
			Fourth argument must be an instance of Map.`);
		
		log('Initialize');

		this.instruments = instruments;
		this.runnerFunction = runnerFunction;
		this.accounts = accounts;
		this.config = backtestConfig;
		// Orders are a simple array that are passed to runners.
		this.orders = [];
		// TODO: Track positions and orders history.
	}

	/**
	* Sets up the handlers for every instrument and runs through the instruments
	*/
	async run() {
		log('Run');
		this.instruments.on('close', this.handleClose.bind(this));
		this.instruments.on('afterOpen', this.handleAfterOpen.bind(this));
		//this.instruments.on('newInstrument', (instrument) => instrument.); // Set size to 0
		await this.instruments.run();
		log('Account is %o', this.accounts.data);
	}

	/**
	* Handles the close event of an instrument, runs all runners and updates orders
	* @private
	*/
	handleClose(data) {
		const orders = this.runnerFunction(this.orders, data.instrument, 
			this.instruments.instruments, this.accounts);
		this.checkOrders(orders);
		// Update orders *after* they were checked
		this.orders = orders;
		log('Handle close for %s on %s; we got %d orders', data.instrument.name, data.data.date, 
			this.orders.length);
	}

	/**
	* Checks if the orders array contains valid entries
	* @param {array} orders			Orders to check
	* @private
	*/
	checkOrders(orders) {
		// Orders is not an array
		if (!Array.isArray(orders)) throw new Error(`BacktestInstanceRunner: your runner functions
			returned invalid orders, those must be an array.`);
		// Every order needs an instrument and a size
		orders.forEach((order) => {
			if (!order.hasOwnProperty('instrument') || !order.hasOwnProperty('size') || 
				isNaN(order.size)) {
				throw new Error(`BacktestInstanceRunner: Every order must have an instrument and a
					size field which is a number; your order is ${ JSON.stringify(order) }`);
			}
		});
	}

	/**
	* Handles the open event of an instrument, executes orders
	* @param {array} data		Array of instruments that were just opened
	* @private
	*/
	handleAfterOpen(data) {
		log('Handle afterOpen for %s on %s', data.map((instrument) => instrument.name).join(', '),
			data[0].head().date);

		// Merge all orders (one instrument might have multiple orders; merge them into one single
		// order)
		const mergedOrders = mergeOrders(this.orders);

		// Check which instrument's positions are *reduced* and execute them first to get some 
		// spare money on the cash account before executing other orders
		const sortedOrders = sortOrdersBySizeChange(mergedOrders, this.dataSeriesSizeKey);		

		sortedOrders.map((order) => {
			this.executeOrder(order);
		});

		// Delete all orders – they're good for 1 bar only
		this.orders = [];

	}


	/**
	* Tries to execute an order; outputs a warning if not enough cash is available
	* @param {object} order
	* @param {number} order.size
	* @param {Instrument} order.instrument
	*/
	executeOrder(order) {

		const currentSize = order.instrument.head()[this.dataSeriesSizeKey] || 0;
		console.log('--------', order.instrument.head());
		const newSize = currentSize + order.size;
		// Positive if position grows, negative if it shrinks
		const absoluteSizeDifference = Math.abs(newSize) - Math.abs(currentSize);
		// Value of the position change
		const positionChangeValue = absoluteSizeDifference * order.instrument.head().open;

		if (positionChangeValue > this.accounts.head().cash) {
			log(`WARNING: Not enough cash available to buy %d %s on %s. Cash available: %d, you
				need %d`, newSize - currentSize, order.instrument.name, 
				order.instrument.head().date, this.accounts.head().cash, positionChangeValue);
		}
		else {
			log('%s: Buy %d of %s @ %d, prev amount %d, new amount %d, cash change %o', 
				order.instrument.head().date, order.size, 
				order.instrument.name, order.instrument.head().open, 
				currentSize, newSize, positionChangeValue);
			// Update instrument: Add col with key this.dataSeriesSizeKey and value newSize
			order.instrument.set({ [this.dataSeriesSizeKey]: newSize });
			// Update account's cash value
			this.accounts.add(order.instrument.head().date, {
				cash: this.accounts.head().cash - positionChangeValue
			});
		}

	}


}

