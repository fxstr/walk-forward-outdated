import dataSortFunction from '../../helpers/dataSortFunction.js';
import groupArrayByValue from '../../helpers/groupArrayByValue.js';


/**
* CSV source that has been reformatted to return the results expected by BacktestInstruments,
* i.e. is an async generator. Makes sure that data are only read once (to minimize I/O operations)
* by using a promise for reading data.
 */
export default class BacktestCSVSource {

    /**
     * Turns to true as soon as we have started reading CSV data
     */
    csvReadingPromise = false;

    constructor(csvSource) {
        if (!csvSource) {
            throw new Error(`BacktestCSVSource: Pass a valid CSV source as argument, is ${csvSource}.`);
        }
        if (!csvSource.read || typeof csvSource.read !== 'function') {
            throw new Error(`BacktestCSVSource: Make sure the CSV source you pass in has a read method, is ${csvSource.read}.`);
        }
        this.csvSource = csvSource;
    }

    /**
     * Main function: Reads CSV, sorts data and yields it interval by interval (e.g. daily)
     */
    async* generate() {
        await this.setupData();
        // eslint-disable-next-line no-unused-vars
        for (const [key, content] of this.csvDataGroupedByDate) {
            yield content;
        }
    }

    /**
     * Reads data from source passed in, sorts and groups it and stores it in
     * this.csvDataGroupedByDate
     * @private
     */
    async setupData() {
        // First call: Fetch all data, sort and store it.
        if (!this.csvReadingPromise) {
            this.csvReadingPromise = this.csvSource.read();
            const csvData = await this.csvReadingPromise;
            // Sort by date first so that all entries in the map grouped by date are
            // chronologically sorted
            const sortedCSVData = csvData.slice(0).sort(dataSortFunction);
            this.csvDataGroupedByDate = groupArrayByValue(
                sortedCSVData,
                // Make sure we use a Number (and not a native date) to group items by as a Date
                // instance will never equal another Date instance
                item => item.get('date').getTime(),
            );
        }
        // Subsequent calls: Wait to make sure data is ready
        else {
            await this.csvReadingPromise;
        }
    }

}
