import AwaitingEventEmitter from '../awaiting-event-emitter/AwaitingEventEmitter';
import Instrument from '../instrument/Instrument';
import debug from 'debug';
const log = debug('WalkForward:BacktestInstruments');

/**
* Brings instruments into a form that can be consumed by backtest.run() – i.e. an eventEmitter 
* that emits a 'open', 'close' and 'newInstrument' events whenever those happen.
*/
export default class BacktestInstruments extends AwaitingEventEmitter {

	/**
	* Holds all instruments for the current backtest
	* @private
	*/
	instruments = [];

	/**
	* If backtestMode is enabled, collect all data and only emit events when next interval starts
	* @private
	*/
	dataOfSameInterval = [];

	/**
	* @param {function} generatorFunction 	An async generator function that returns data whenever
	*										it is ready.See e.g. DataGenerator.generateData().
	* @param {boolean} backtestMode			Set to true if all data of an interval should be 
	*										collected before data events (open/close) are emitted.
	*										Reason: If we don't collect the data, an open event for
	*										*one instrument* can only be fired just before its close
	*										event. For one certain interval, events will fire as
	*										follows: 
	*										open a, close a, open b, close b, open c, close c
	*										As orders are executed on open, this does not correctly
	*										reflect reality. If we collect data, events will fire 
	*										as follows for a certain interval (but only when the 
	*										next interval starts):
	*										open a, open b, open c, close a, close b, close c
	*										However, when live trading, we want to see our trades 
	*										immediately and should therefore not use this mode 
	*										(which only fires events when the next interval has
	*										begun).
	*										
	*/
	constructor(generatorFunction, backtestMode) {
		super();
		if (typeof generatorFunction !== 'function') throw new Error(`BacktestInstruments: 
			Provide a generator function as first argument, type provided is 
			${ typeof generatorFunction }.`);
		this.backtestMode = backtestMode;
		this.generatorFunction = generatorFunction;
	}


	/**
	* Runs the async generator until it's all done. Creates instruments out of the data received
	* and emits a data event on every iteration, then awaits completion of the registered handlers.
	*/
	async run() {
		log('run method called, generatorFunction is %o', this.generatorFunction);
		for await (const data of this.generatorFunction()) {
			log('Data is %o, backtest mode %o', data, this.backtestMode);

			if (!data.date) {
				throw new Error(`BacktestInstruments: Source's data records must contain a date  
					field which holds a valid date; instead, your source's record is ${data }.`);
			}

			if (this.backtestMode) {
				// Date change: Next interval has begun, emit events for all previously stored
				// data. Be careful: For the latest data, no event will be emitted!
				if (
					this.dataOfSameInterval.length &&
					this.dataOfSameInterval.slice(-1)[0].date.getTime() !==
					data.date.getTime()
				) {
					await this.clearDataOfSameInterval();
				}
				this.dataOfSameInterval.push(data);
			}
			else {
				await this.emitOpenEvent(data);
				await this.emitCloseEvent(data);
			}
		}
	}


	/**
	* Emits events for all data stored in this.dataOfSameInterval and clears this.dataOfSameInterval
	* @private
	*/
	async clearDataOfSameInterval() {
		// First emit all open events, only then emit all close events
		for (const data of this.dataOfSameInterval) {
			await this.emitOpenEvent(data);
		}
		for (const data of this.dataOfSameInterval) {
			await this.emitCloseEvent(data);
		}
		this.dataOfSameInterval = [];
	}


	/**
	* Prepares and emits an open event
	* @private
	* @param {object} data
	*/
	async emitOpenEvent(data) {
		if (!this.canEmitOpenEvent(data)) {
			log('Data %o has no open field, cannot emit open event', data);
			return;
		}

		const instrument = this.getOrCreateInstrument(data.instrument);

		// When 'open' is emitted, orders that were opened on the previous bar will be fulfilled.
		const openData = { open: data.open };
		log('Emit open event for data %o with data %o', data, openData);
		await instrument.addData(data.date, openData);
		await this.emit('open', {
			data: openData,
			instrument: instrument,
		});
	}


	/**
	* Prepares and emits a close event
	* @private
	* @param {object} data
	*/
	async emitCloseEvent(data) {

		const instrument = this.getOrCreateInstrument(data.instrument);
		// Emit data without the date field (which serves as a key for DataSeries)
		const bareData = { ...data };
		['date', 'instrument'].forEach((field) => delete bareData[field]);

		// New data was added to instrument on open event – just add the other data to the
		// same field
		if (this.canEmitOpenEvent(data)) {
			const otherData = { ...data };
			// Remove unnecessary fields from data that will be emitted
			['instrument', 'open', 'date'].forEach((field) => delete otherData[field]);
			await instrument.data.set(otherData);
		}
		// No open event was emitted: Add all data to the instrument in a new row
		else {
			// Data without the date (which is used as key)
			await instrument.addData(data.date, bareData);
		}

		await this.emit('close', {
			data: bareData,
			instrument: instrument,
		});

	}


	/**
	* Checks if a certain data row has an open property (and can therefore fire an open event)
	* @private
	* @param {object} data
	*/
	canEmitOpenEvent(data) {
		return Object.prototype.hasOwnProperty.call(data, 'open');
	}


	/**
	* Returns an instrument from this.instruments if it was found, else creates it. 
	* @private
	* @param {string} name			Instrument's name
	*/
	getOrCreateInstrument(name) {
		const found = this.instruments.find((instrument) => instrument.name === name);
		if (found) return found;
		else {
			const instrument = new Instrument(name);
			this.instruments.push(instrument);
			this.emit('newInstrument', instrument);
			return instrument;
		}
	}

}
