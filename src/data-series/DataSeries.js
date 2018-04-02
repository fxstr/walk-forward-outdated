import debug from 'debug';
import convertObjectToMap from './convertObjectToMap';
const log = debug('WalkForward:DataSeries');

/**
* Stores multiple values for a given key. Key is e.g. a date, values 'open', 'close' etc.
* Key must not be unique – as there may be be multiple keys that are equal (e.g. same date)
*/
export default class DataSeries {

	/**
	* @private 
	* Holds the data series's data as objects with key: key, data: Map()
	*/
	internalData = [];
	



	/**
	* Adds one or multiple values for a given key. 
	* @param {*} key				Key for the row
	* @param {Map|object} data		Data to add, Maps are preferred
	*/
	add(key, data) {

		log('Add key %o, data %o', key, data);

		// If an object (which is not a map) is passed, try to convert it to a Map
		if (typeof data === 'object' && !(data instanceof Map)) {
			try {
				data = convertObjectToMap(data);
			}
			catch(err) {
				log(`Could not convert object passed to a map, error is %s.`, err.message);
			}
		}

		// Validate data parameter
		if (!data || !(data instanceof Map)) {
			throw new Error(`DataSeries: Second parameter passed to add method must be a Map,
				is ${ data }.`, );
		}

		// Use object with keys 'key' and 'data' to store our data
		const entry = {
			key: key,
			// Clone data or original data is modified when set() is used
			data: new Map(data),
		}
		this.internalData.push(entry);
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
	* @param {Map|object} data			Data to add to current row in the form of { colName: value }
	*									or new Map([['col': 'value']]). Maps are preferred.
	*/
	set(data) {

		// If an object (which is not a map) is passed, try to convert it to a Map
		if (typeof data === 'object' && !(data instanceof Map)) {
			try {
				data = convertObjectToMap(data);
			}
			catch(err) {
				log(`Could not convert object passed to a map, error is %s.`, err.message);
			}
		}

		if (!data || !(data instanceof Map)) {
			throw new Error(`DataSeries: argument for set method must be a Map, is %o`,
				data);
		}
		if (!this.internalData.length) {
			throw new Error(`DataSeries: Cannot set data on head row as there are no rows 
				at all`);
		}
		const headRow = this.head();
		for (const [key, value] of data) {
			// Don't let user overwrite existing data; if we did, we'd have to implement an other
			// test to see if transformers were called.
			if (headRow.has(key)) {
				throw new Error(`DataSeries: Existing values cannot be overwritten by using the
					set method; tried to overwrite %o with %o, is already %o`, key, value,
					headRow.get(key));
			}
			log('Set col %o to %o', key, value);
			headRow.set(key, value);

		}
	}


	/**
	* Returns the latest few rows
	* @param {int} itemCount		Amount of items to return, defaults to 1
	* @returns {array|object}		Array of objects (if param intemCount > 1), else a single 
	*								object (wich corresponds to the data field of internalData; key
	*								is ignored)
	*/
	head(itemCount = 1) {
		const result = this.internalData
			.slice(itemCount * -1)
			.reverse()
			.map((item) => item.data);
		return itemCount === 1 ? result[0] : result;
	}


	/**
	* Returns the first few rows
	* @param {int} itemCount		Amount of items to return, defaults to 1
	* @returns {array|object}		Array of objects (if param intemCount > 1), else a single 
	*								object (wich corresponds to the data field of internalData; key
	*								is ignored)
	*/
	tail(itemCount = 1) {
		const result = this.internalData
			.slice(0, itemCount)
			.map((item) => item.data);
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
	/*doesHeadRowContainColumn(columnName) {
		return this.head().length && this.head()[0].hasOwnProperty(columnName);
	}*/

}

