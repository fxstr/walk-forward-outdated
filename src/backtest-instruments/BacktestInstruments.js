import AwaitingEventEmitter from '../awaiting-event-emitter/AwaitingEventEmitter'
import Instrument from '../instrument/Instrument';
import debug from 'debug';
const log = debug('WalkForward:BacktestInstruments');

/**
* Brings instruments in a form that can be consumed by run
*/
export default class BacktestInstruments extends AwaitingEventEmitter {

	/**
	* Holds all instruments for the current backtest
	* @private
	*/
	instruments = [];

	constructor(generatorFunction) {
		super();
		if (typeof generatorFunction !== 'function') throw new Error(`BacktestInstruments: 
			Provide a generator function as first argument, type provided is 
			${ typeof generatorFunction }.`);
		this.generatorFunction = generatorFunction;
	}

	/**
	* Runs the async generator until it's all done. Creates instruments out of the data received
	* and emits a data event on every iteration, then awaits completion of the registered handlers.
	*/
	async run() {
		log('run method called, generatorFunction is %o', this.generatorFunction);
		for await (const data of this.generatorFunction()) {
			log('Data is %o', data);
			const instrument = this.getOrCreateInstrument(data.instrument);
			// dataContent is data without the date field which is used as a key
			const dataContent = { ...data };
			delete dataContent.date;
			await instrument.addData(data.date, dataContent);
			await this.emit('data', {
				data: data,
				instrument: instrument,
			});
		}
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