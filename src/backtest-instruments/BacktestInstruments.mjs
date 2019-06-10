import AwaitingEventEmitter from '../awaiting-event-emitter/AwaitingEventEmitter';
import Instrument from '../instrument/Instrument';
import logger from '../logger/logger';
import checkInstrumentData from '../helpers/checkInstrumentData';
import { formatDate } from '../helpers/formatLogs';

const log = logger('WalkForward:BacktestInstruments');
const { debug } = log;

/**
 * Converts data from a fitting data source to instruments and emits events for 'close', 'open' and
 * 'newInstrument'. Will be consumed by new Backtest().run()
*/
export default class BacktestInstruments extends AwaitingEventEmitter {

    /**
     * Holds all instruments for the current backtest. Key: name, value: instance of Instrument.
     * @private
     */
    instruments = new Map();


    /**
     * @param {function} generatorFunction  An async generator function that returns data (for a
     *                                       whole interval, e.g. day) whenever it is ready; see
     *                                       e.g. BacktestCSVSource.
     */
    constructor(generatorFunction, startDate, endDate) {
        super();
        if (typeof generatorFunction !== 'function') {
            throw new Error(`BacktestInstruments: Provide a generator function as first argument, type provided is ${typeof generatorFunction}.`);
        }
        if (startDate && !(startDate instanceof Date)) {
            throw new Error(`BacktestInstruments: if startDate is provided, it must be a Date, is ${startDate}.`);
        }
        if (endDate && !(endDate instanceof Date)) {
            throw new Error(`BacktestInstruments: if endDate is provided, it must be a Date, is ${endDate}.`);
        }
        this.generatorFunction = generatorFunction;
        this.startDate = startDate;
        this.endDate = endDate;
    }


    /**
     * Runs the async generator until it's all done. Creates instruments out of the data received
     * and emits a data event on every iteration, then awaits completion of the registered handlers.
     */
    async run() {
        log.info('Run instruments');
        for await (const intervalData of this.generatorFunction()) {
            // Check all generated data for its validity
            intervalData.forEach(dataSet => checkInstrumentData(dataSet));

            // Only emit if current startDate < intervalData < endDate
            const currentDate = intervalData[0].get('date');
            if (this.startDate && this.startDate.getTime() > currentDate.getTime()) continue;
            if (this.endDate && this.endDate.getTime() < currentDate.getTime()) continue;

            // Open: Create instrument, add open and date
            const openedInstruments = await this.openInstruments(intervalData);
            log.info('%s Emit open', formatDate(currentDate));
            await this.emit('open', openedInstruments);

            // Close
            const closedInstruments = await this.closeInstruments(intervalData);
            log.info('%s Emit close', formatDate(currentDate));
            await this.emit('close', closedInstruments);
        }
    }


    /**
     * Converts instrument data to instances of Instrument, sets date and open properties on them,
     * then returns the updated Instruments
     * @param {Map[]} instrumentsData   Data for instruments that were opened (Map with keys for
     *                                  name, date, open …)
     * @return {Instrument[]}           Created or updated instruments
     * @private
     */
    async openInstruments(instrumentsData) {
        return Promise.all(instrumentsData.map(async(instrumentData) => {
            const instrument = await this.getOrCreateInstrument(instrumentData.get('instrument'));
            await instrument.add(new Map([
                ['date', instrumentData.get('date')],
                ['open', instrumentData.get('open')],
            ]));
            return instrument;
        }));
    }


    /**
     * Adds all other fields than name, open and date to the Instrument that matches instrumentData
     * and returns all affected Instruments as an array.
     * @param  {Map[]} instrumentsData  Data for all instruments that were closed
     * @return {Instrument[]}           Instances of Instrument with updated fields for the
     *                                  instrumentsData that was passed
     */
    async closeInstruments(instrumentsData) {
        return Promise.all(instrumentsData.map(async(instrumentData) => {
            const instrument = await this.getOrCreateInstrument(instrumentData.get('instrument'));
            // Delete fields that were already added to instrument from (a clone of) instrumentData
            const cleanedMap = new Map(instrumentData);
            ['open', 'instrument', 'date'].forEach(field => cleanedMap.delete(field));
            await instrument.set(cleanedMap);
            return instrument;
        }));
    }


    /**
    * Returns an instrument from this.instruments if it was found, else creates it.
    * @private
    * @param {string} name          Instrument's name
    */
    async getOrCreateInstrument(name) {
        const existingInstrument = this.instruments.get(name);
        if (existingInstrument) return existingInstrument;
        else {
            debug('Create new instrument %o, emit newInstrument', name);
            const instrument = new Instrument(name);
            this.instruments.set(name, instrument);
            await this.emit('newInstrument', instrument);
            return instrument;
        }
    }

}
