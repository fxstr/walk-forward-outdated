import debug from 'debug';
const log = debug('WalkForward:DataGenerator');

/**
* We cache our data (see DataCache); this async generator merges cached and new data into one
* async iterator and therefore hides implementation details (caching, kind of source).
*
* Cache must contain a data property which is an array. 
* Source must have a read method which returns a promise; the promise must resolve to false if
* there is no data available any more.
*/
export default class DataGenerator {

	/**
	* Read from cache as long as entries exist; this is the index of the current cache
	* entry.
	* @private
	*/
	currentCacheEntry = 0;

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

		log('Initialize with source %o and sorFunction %o', source, sortFunction);
		this.source = source;
		this.sortFunction = sortFunction;

	}


	/**
	* Get the next data set
	*/
	async* generateData() {

		log('generateData called');

		while(true) {

			// Read from cache as long as we have a next entry; if cache is empty, we make a call
			// to source.read() which fills up the cache. Never return a record directly from the 
			// source.
			if (this.cache.length > this.currentCacheEntry) {
				log('Take data from cache, index is %d', this.currentCacheEntry);
				const sorted = this.sortFunction ? 
					this.cache.slice(0).sort(this.sortFunction) :
					this.cache;
				yield sorted[this.currentCacheEntry];
				this.currentCacheEntry++;
			}

			// Cache is empty: Try to read next lines from the source. If source returns, continue
			// reading from the cache; else break.
			else {
				log('Source has no more data; try to read');
				const nextData = await this.source.read();
				log('Got data %o', nextData);
				if (nextData !== false) {
					this.cache.push(nextData);
					log('Add data %o to cache to later read from', nextData);
					continue;
				} else {
					log('Out of data');
					break;
				}
			}

		}
	}

}
