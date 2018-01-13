import debug from 'debug';
const log = debug('WalkForward:DataSeries');

/**
* Stores multiple values for a given key. Key is e.g. a date, values 'open', 'close' etc.
* Key must not be unique – as there may be be multiple keys that are equal (e.g. same date)
*/
export default class DataSeries {

	/** @private */
	internalData = [];
	

	/**
	* Adds one or multiple values for a given key. Only one row (key) may be passed. Row is only
	* pushed to data *after* all transformers were executed.
	* @param {*} key
	* @param {Object} data
	*/
	add(key, data) {

		log('Add key %o, data %o', key, data);

		// Validate data parameter
		if (!data || typeof data !== 'object') {
			throw new Error(`DataSeries: Second parameter passed to add must be an object,
				is ${ typeof data }.`);
		}

		this.data.push({
			key: key,
			data: data,
		});
	}


	/**
	* Prevents users from modifying data directly
	* @private
	*/
	set data(value) {
		throw new Error(`DataSeries: Don't modify data directly, use add method.`);
	}


	/**
	* Returns the data added through add
	* @returns {object}
	*/
	get data() {
		return this.internalData;
	}


	/**
	* Adds data (columns) to the head row. Is needed for external scripts to modify the
	* DataSeries and to add results of transformations.
	*/
	set(data) {
		if (!data || typeof data !== 'object') {
			throw new Error(`DataSeries: argument for set method must be an object, is 
				${ typeof data }.`);
		}
		if (!this.internalData.length) {
			throw new Error(`DataSeries: Cannot set data to head row as there are no rows 
				at all`);
		}
		const keys = Object.keys(data).concat(Object.getOwnPropertySymbols(data));
		log('Set columns for keys %o on head row', keys);
		const headRow = this.head();
		keys.forEach((key) => {
			// Don't let user overwrite existing data; if we did, we'd have to implement an other
			// test to see if transformers were called.
			if (headRow.data.hasOwnProperty(key)) {
				throw new Error(`DataSeries: Existing values cannot be overwritten by using the
					set method; tried to overwrite ${ key } with ${ data[key] }, is 
					${headRow.data[key] }.`);
			}
			log('Set key %o to %o', key, data[key]);
			headRow.data[key] = data[key];
		});
	}


	/**
	* Returns the latest few rows
	* @param {int} itemCount		Amount of items to return, defaults to 1
	* @returns {array|object}		Array of objects (if param intemCount > 1), else a single 
	*								object. Each object contains two properties key and data.
	*/
	head(itemCount = 1) {
		const result = this.internalData
			.slice(itemCount * -1)
			.reverse();
		return itemCount === 1 ? result[0] : result;
	}


	/**
	* Returns the first few rows
	* @param {int} itemCount		Amount of items to return, defaults to 1
	* @returns {array|object}		Array of objects (if param intemCount > 1), else a single 
	*								object. Each object contains two properties key and data.
	*/
	tail(itemCount = 1) {
		const result = this.internalData.slice(0, itemCount);
		return itemCount === 1 ? result[0] : result;
	}


	/**
	* Returns all data for a certain key
	* @param {any} key		Key to filter data by
	* @returns {array}		An array of all data for the given key. Empty if key was not found.
	*/
	getDataByKey(key) {
		return this.internalData
			.filter((item) => item.key === key)
			.map((item) => item.data);
	}


	/**
	* Returns true if col with name is available on the head row, else false
	* @protected
	* @param {*} columnName		Name of the column to look for
	*/
	doesHeadRowContainColumn(columnName) {
		return this.head().length && this.head()[0].data.hasOwnProperty(columnName);
	}

}

