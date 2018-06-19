import debug from 'debug';
import ColumnConfig from './ColumnConfig';
import convertObjectToMap from './convertObjectToMap';
import cloneDataSeries from './cloneDataSeries';
const log = debug('WalkForward:DataSeries');

/**
* Stores multiple values for a given key. Key is e.g. a date, values 'open', 'close' etc.
* Key must not be unique – as there may be be multiple keys that are equal (e.g. same date)
*/
export default class DataSeries {


	/**
	* Holds the data series's data as objects with key: key, data: Map()
	* @private 
	*/
	internalData = [];


	/**
	 * Holds column information. Key is the column's key, value the configuration. Configuration
	 * may contain
	 * - View information (for diagrams, tables …)
	 * - Type information (Date etc., e.g. to format and read CSV)
	 * - A description (if key is a Symbol; e.g. for CSV output)
	 * @private
	 */
	columns = new Map();
	



	/**
	* Adds one or multiple values for a given key. 
	* @param {Map|object} data		Data to add, Maps are preferred
	*/
	add(data) {

		log('Add data %o', data);

		// If an object (which is not a map) is passed, try to convert it to a Map
		if (typeof data === 'object' && !(data instanceof Map)) {
			data = convertObjectToMap(data);
		}

		// Validate data parameter
		if (!data || !(data instanceof Map)) {
			throw new Error(`DataSeries: Data passed to add method must be a Map,
				is ${ data }.`, );
		}

		// If column key is new, add it to this.columns
		this.addColumns(data);

		// Clone data or original data is modified when set() is used which adds a new item to the
		// Map
		this.internalData.push(new Map(data));

	}


	/**
	 * Returns the default config for a column
	 * @private
	 * @return {object} 	Column configuration
	 */
	getDefaultColumnConfiguration() {
		return new ColumnConfig();
	}

	/**
	 * Adds data to this.columns if key is not yet present
	 * @private
	 * @param {Map} data		Data (passed through this.add or this.set)
	 */
	addColumns(data) {
		for (const [key] of data) {
			if (!this.columns.has(key)) this.columns.set(key, this.getDefaultColumnConfiguration());
		}		
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
			data = convertObjectToMap(data);
		}

		if (!(data instanceof Map)) {
			throw new Error(`DataSeries: Argument for set method must be a Map, is %o`,
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

		// Only add columns after testing data and throwig errors
		this.addColumns(data);

	}


	/**
	* Returns the latest few rows
	* @param {integer} itemCount	Amount of items to return, defaults to 1
	* @paramm {integer} startIndex	Index to start (from the end), defaults to 0
	* @returns {array|object}		Array of objects (if param intemCount > 1), else a single 
	*								object (wich corresponds to the data field of internalData; key
	*								is ignored)
	*/
	head(itemCount = 1, startIndex = 0) {
		const len = this.internalData.length;
		const result = this.internalData
			// Don't use negative numbers, they will slice from the end!
			.slice(Math.max(0, len - itemCount - startIndex), Math.max(0, len - startIndex))
			.reverse();
		return itemCount === 1 ? result[0] : result;
	}


	/**
	* Returns the first few rows
	* @param {integer} itemCount	Amount of items to return, defaults to 1
	* @paramm {integer} startIndex	Index to start, defaults to 0
	* @returns {array|object}		Array of objects (if param intemCount > 1), else a single 
	*								object (wich corresponds to the data field of internalData; key
	*								is ignored)
	*/
	tail(itemCount = 1, startIndex = 0) {
		const result = this.internalData
			.slice(startIndex, itemCount + startIndex);
		return itemCount === 1 ? result[0] : result;
	}


	/**
	 * Creates a new DataSeries from an existing data set (source). If a transformer is passed, 
	 * it's applied to the data passed.
	 * @param  {DataSeries} source      		An existing DataSeries
	 * @param  {function} transformer			Function that takes 3 arguments: column, row and 
	 *                                	 		cell. Must return the new cell value.
	 * @param {function} columnKeyTransformer 	Function that takes a single argument (column key)
	 *                                         	and returns new column key
	 * @return {DataSeries}             		Copied and transformed DataSeries
	 */
	static from(source, transformer, columnKeyTransformer) {

		if (transformer !== undefined && typeof transformer !== 'function') {
			throw new Error(`DataSeries: Second argument of transformer must be a function or
				nothing at all.`);
		}

		if (source instanceof DataSeries) {
			return cloneDataSeries(DataSeries, source, transformer, columnKeyTransformer);
		}
		else {
			throw new Error(`DataSeries: Call static from method with an existing DataSeries;
				other sources are not yet supported.`);
		}

	}

}

