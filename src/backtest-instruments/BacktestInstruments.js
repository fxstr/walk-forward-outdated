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
	*										immediately and should therefore not use this mode. If 
	*										you use a continuous data source (whose generator 
	*										function does never end) open/close events for the  
	*										latest data set will only fire *after* a new data set
	*										for the *next* date came in.
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

			log('Generated data is %o', data);

			if (!(data instanceof Map)) throw new Error(`BacktestInstruments: data returned by 
				generatorFunction must be a map, is ${ data }.`);

			log('New data from generatorFunction is %o, backtest mode %o', data, this.backtestMode);

			// Is date property missing or not a valid date?
			// https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-
			// in-javascript
			if (!data.has('date') || !(data.get('date') instanceof Date) || 
				isNaN(data.get('date'))) {
				throw new Error(`BacktestInstruments: Source's data records must contain a date  
					field which holds a valid date; instead, your source's record is ${ data }.`);
			}

			// Make sure at least close is present – if not, the close event can not
			// be fired as needed, backtest will do nothing. 
			if (!data.has('close') || isNaN(data.get('close'))) {
				throw new Error(`BacktestInstruments: Your generator function returned data that
					does not have a close property or the property is not a number.`);
			}

			if (this.backtestMode) {
				// Date change: Next interval has begun, emit events for all previously stored
				// data. Be careful: For the latest data, no event will be emitted!
				if (
					this.dataOfSameInterval.length &&
					this.dataOfSameInterval.slice(-1)[0].get('date').getTime() !==
					data.get('date').getTime()
				) {
					await this.clearDataOfSameInterval();
				}
				this.dataOfSameInterval.push(data);
			}
			else {
				await this.emitOpenEvent(data);
				await this.emitAfterOpenEvent([data]);
				await this.emitCloseEvent(data);
				await this.emitAfterCloseEvent([data]);
			}
		}
		// If we're in backtestMode and on a non-continuous data source (e.g. a CSV, but not a 
		// continuously pulling web service), clear all data that's stored in dataOfSameInterval. 
		// Why? Because we only clear dataOfSameInterval as soon as the date changes – and that
		// does not happen for the very last entries.
		if (this.backtestMode) await this.clearDataOfSameInterval();
	}


	/**
	* Emits events for all data stored in this.dataOfSameInterval and clears this.dataOfSameInterval
	* @private
	*/
	async clearDataOfSameInterval() {
		// There's no need to clean data if there is no data on the latest interval; this may happen
		// on the last tick if we're running in backtestMode
		if (!this.dataOfSameInterval.length) return;
		// First emit all open events, only then emit all close events
		for (const data of this.dataOfSameInterval) {
			await this.emitOpenEvent(data);
		}
		await this.emitAfterOpenEvent(this.dataOfSameInterval);
		for (const data of this.dataOfSameInterval) {
			await this.emitCloseEvent(data);
		}
		await this.emitAfterCloseEvent(this.dataOfSameInterval);
		this.dataOfSameInterval = [];
	}


	/**
	* Emits afterOpen event after all open events were fired: 
	* - one single event for all current open events if we're in backtest mode
	* - one event after every open event if we're not in backtest mode
	* @param {array} data		All data (from this.dataOfSameInterval) that was previously opened
	* @emits afterOpen
	* @private
	*/
	async emitAfterOpenEvent(data) {
		// Only emit *one* afterOpen event for all opened instruments. Why? Because on 
		// afterOpen we execute orders (and want to do so only once for the whole strategy)
		const instruments = data.map((item) => this.getOrCreateInstrument(item.get('instrument')));
		await this.emit('afterOpen', instruments);
	}

	/**
	* Emits afterClose event after all close events were fired.
	* @param {array} data		All data (from this.dataOfSameInterval) that was previously closed
	* @emits afterClose
	* @private
	*/
	async emitAfterCloseEvent(data) {
		// Only emit *one* afterClose event for all closed instruments. Why? Because on 
		// afterClose we calculate all accounts' close values
		const instruments = data.map((item) => this.getOrCreateInstrument(item.get('instrument')));
		await this.emit('afterClose', instruments);
	}

	/**
	* Prepares and emits an open event
	* @param {object} data		Data to emit open event for (an entry of this.dataOfSameInterval)
	* @emits open
	* @private
	*/
	async emitOpenEvent(data) {
		if (!this.canEmitOpenEvent(data)) {
			log('Data %o has no open field, cannot emit open event', data);
			return;
		}

		const instrument = this.getOrCreateInstrument(data.get('instrument'));

		// When 'open' is emitted, orders that were opened on the previous bar will be fulfilled.
		const openData = new Map([['open', data.get('open')], ['date', data.get('date')]]);
		log('Emit open event for data %o with data %o', data, openData);
		await instrument.add(openData);
		await this.emit('open', {
			data: openData,
			instrument: instrument,
		});
	}


	/**
	* Prepares and emits a close event
	* @param {object} data		Data to emit close event for
	* @emits close
	* @private
	*/
	async emitCloseEvent(data) {

		const instrument = this.getOrCreateInstrument(data.get('instrument'));
		// Emit data without the date field (which serves as a key for DataSeries)
		const bareData = new Map(data);
		// Don't remove date field – it should be emitted so it can be easily accessed (by
		// calling head() on DataSeries). But remove instrument field which is emitted otherwise.
		bareData.delete('instrument');

		// New data was added to instrument on open event – just add the other data to the
		// same field
		if (this.canEmitOpenEvent(data)) {
			const otherData = new Map(data);
			// Remove unnecessary fields from data that will be emitted
			['instrument', 'open', 'date'].forEach((field) => otherData.delete(field));
			await instrument.set(otherData);
		}
		// No open event was emitted: Add all data to the instrument in a new row
		else {
			// Data without the date (which is used as key)
			await instrument.add(bareData);
		}

		log('Emit close event with data %o for instrument %o', bareData, instrument);
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
		return data.has('open');
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
			log('Create new instrument %o, emit newInstrument', name);
			const instrument = new Instrument(name);
			this.instruments.push(instrument);
			this.emit('newInstrument', instrument);
			return instrument;
		}
	}

}
