import debug from 'debug';
const log = debug('DataGenerator');

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

	constructor(cache, source, sortFunction) {

		if (!cache || !cache.data || !Array.isArray(cache.data)) throw new Error(`DataGenerator: 
			First argument passed to constructor must be the cache; it must contain a property  
			called data which is an array.`);

		if (!source || !source.read || typeof source.read !== 'function') {
			throw new Error(`DataGenerator: Second argument passed to constructor must be a source
				that has a property «read» which is a function.`);
		}

		if (sortFunction !== undefined && typeof sortFunction !== 'function') {
			throw new Error(`DataGenerator: Third argument passed to constructor may be a
				sort function; if you pass a third argument, make sure it's a function.`);
		}

		log('Initialize with source %o and cache %o', source, cache);
		this.cache = cache;
		this.source = source;
		this.sortFunction = sortFunction;

	}

	/**
	* Get the next data set
	*/
	async* generateData() {

		while(true) {

			// Read from cache as long as we have a next entry; if cache is empty, we make a call
			// to source.read() which fills up the cache. Never return a record directly from the 
			// source.
			if (this.cache.data.length > this.currentCacheEntry) {
				const sorted = this.sortFunction ? 
					this.cache.data.slice(0).sort(this.sortFunction) :
					this.cache.data;
				yield sorted[this.currentCacheEntry];
				this.currentCacheEntry++;
			}


			// Cache is empty: Try to read next lines from the source. If source returns, continue
			// reading from the cache; else break.
			else {
				const nextData = await this.source.read();
				if (nextData !== false) continue;
				else break;
			}

		}
	}

}
