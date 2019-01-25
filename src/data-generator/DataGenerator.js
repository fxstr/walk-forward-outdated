import logger from '../logger/logger';
const { debug } = logger('WalkForward:DataGenerator');

/**
* Does two things: 
* - Wraps our sources into a generator
* - Caches entries and therefore reduces I/O operations (if we run backtest with multiple params)
*
* We cache our data (see DataCache); this async generator merges cached and new data into one
* async iterator and therefore hides implementation details (caching, kind of source).
*
* Source must have a read method which returns a promise; the promise must resolve to false if
* there is no data available any more, else to a single entry, sorted chronologically.
*/
export default class DataGenerator {

	/**
	* Simple cache that prevents us from calling the original source every time the backtest
	* runs (e.g. with different parameters)
	*/
	cache = [];

	constructor(source, sortFunction) {

		if (!source || !source.read || typeof source.read !== 'function') {
			throw new Error(`DataGenerator: First argument passed to constructor must be a source
				that has a property «read» which is a function.`);
		}

		if (sortFunction !== undefined && typeof sortFunction !== 'function') {
			throw new Error(`DataGenerator: Second argument passed to constructor may be a
				sort function; if you pass a second argument, make sure it's a function.`);
		}

		debug('Initialize with source %o. Sort function? %o', source, !!sortFunction);
		this.source = source;
		this.sortFunction = sortFunction;

	}


	/**
	* Get the next data set
	*/
	async* generateData() {

		debug('generateData called');

		// Scope of index must be the function, not the instance if run() method should be 
		// callable multiple times (which it needs to be in order to run a backtest with multiple
		// parameter sets)
		let currentIndex = 0;

		while(true) {

			// Read from cache as long as we have a next entry; if cache is empty, we make a call
			// to source.read() which fills up the cache. Never return a record directly from the 
			// source.
			if (this.cache.length > currentIndex) {
				debug('Take data from cache with length %d, index is %d. Sort? %o', this.cache.length, 
					currentIndex, !!this.sortFunction);
				const sorted = this.sortFunction ? 
					this.cache.slice(0).sort(this.sortFunction) :
					this.cache;
				const nextEntry = sorted[currentIndex];
				debug('Return entry %o', nextEntry);
				yield nextEntry;
				currentIndex++;
			}

			// Cache is empty: Try to read next lines from the source. If source returns, continue
			// reading from the cache; else break.
			else {
				debug('Source has no more data; try to read');
				const nextData = await this.source.read();
				debug('Got data from read: %o', nextData);

				// We expect an array (one or multiple entries) or false!
				if (nextData !== false) {
					if (!Array.isArray(nextData)) throw new Error(`DataGenerator: Data returned
						by read function of your data source must either be an Array or false, 
						currently is ${ nextData }.`);
					this.cache.push(...nextData);
					debug('Add data %o to cache to later read from', nextData);
					continue;
				} else {
					debug('Out of data');
					break;
				}
			}

		}
	}

}
