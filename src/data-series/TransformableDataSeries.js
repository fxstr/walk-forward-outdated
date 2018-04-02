import DataSeries from './DataSeries';
import debug from 'debug';
const log = debug('WalkForward:TransformableDataSeries');

/**
* Extends DataSeries with transformers.
*/
export default class TransformableDataSeries extends DataSeries {

	/** 
	* @private 
	*/
	transformers = [];

	/**
	* Holds all transformers that were executed for the current row (see this.head()), needed to
	* make sure we don't execute a transformer multiple times for a given row.
	* @private
	*/
	executedTransformers = [];

	/**
	* If a transformer's next() method does not return an object, convert it to an object and use
	* this variable's value as the key.
	* @private
	*/
	defaultReturnValuePropertyName = 'value';


	/**
	* Adds one or multiple data values for a given key. Only one row (key) may be passed. *After*
	* the row is added, registered transformers are executed.
	* @param {*} key
	* @param {object} data
	* @returns {Promise}
	*/
	async add(key, data) {

		// Re-start transform process
		this.resetExecutedTransformers();

		// If there are transformers with *no* dependencies, execute them before any data is added
		// (this is a question of definition, could also be done after add is executed)
		// To do so, we 
		// - first create an empty entry (with an empty Map())
		// - then execute the transformers without dependencies
		// - then add the data (through set)

		// Super is not supported on async functions in babel, see 
		// https://github.com/babel/babel/issues/3930
		DataSeries.prototype.add.call(this, key, new Map());
		await this.executeAllTransformers();

		DataSeries.prototype.set.call(this, data);
		await this.executeAllTransformers();

	}


	/**
	* Resets this.executedTransformers; needs to be done when a new row is added.
	* @private
	*/
	resetExecutedTransformers() {
		this.executedTransformers = [];
	}


	/**
	* Adds data (columns) to the head row. Is needed for external scripts to modify the
	* DataSeries and to add results of transformations. Then executes registered transformers.
	* @param {object} data		Data to be added to the head row; key of the object are the column
	*							names, values are the column values.DataSeries
	* @returns {Promise}
	*/
	async set(data) {
		// Super is not supported on async functions in babel, see 
		// https://github.com/babel/babel/issues/3930
		DataSeries.prototype.set.call(this, data);
		await this.executeAllTransformers();
	}


	/**
	* Returns true if a given transformer was already executed for the current head row, else false.
	* @private
	*/
	wasTransformerExecuted(transformer) {
		return this.executedTransformers.indexOf(transformer) > -1;
	}


	/**
	* Returns an object with all properties if the given properties are available on the head 
	* data row, else false
	* @private
	* @param {array} properties		Properties that must exist in order for the function to return
	*								an object
	* @returns {array|false}		An array with all the values requested by properties in order 
	* 								of properties.
	*/
	allPropertiesAvailable(properties) {

		if (!Array.isArray(properties)) {
			throw new Error(`TransformableDataSeries: Argument passed to allPropertiesAvailable 
				must be an array.`);
		}

		const headRow = this.head();
		if (!headRow) {
			throw new Error(`TransformableDataSeries: Cannot check if all properties are available
				as there is no row yet.`);
		}

		// Any one property is missing: Return false
		if (!properties.every((property) => headRow.has(property))) return false;

		// Create partial row object and return it
		return properties.map((property) => headRow.get(property));

	}


	/**
	* Executes all transformers; when new values become available, starts at the beginning
	* @private
	*/
	async executeAllTransformers() {

		const nextExecution = this.getNextTransformerToExecute();
		if (!nextExecution) return;

		const { transformer, data } = nextExecution;

		// For params of next(), see addTransformer; DO NOT PASS more data if not absolutely needed
		// as we want to have stateless/simple transformers
		const transformerResult = transformer.transformer.next(data);
		// Convert any result to a promise (to simplify interactions)
		let promisedTransformerResult = 
			await this.createPromiseFromTransformer(transformerResult);
		this.executedTransformers.push(transformer.transformer);

		// If return value is not a Map(), convert it into a Map as addTransformedData only handles 
		// Maps(). Numbers, strings, objects, bools will all become values.
		if (!(promisedTransformerResult instanceof Map)) {
			promisedTransformerResult = new Map([[
				this.defaultReturnValuePropertyName, promisedTransformerResult]]);
		}

		await this.addTransformedData(promisedTransformerResult, transformer);

		// Do the next round and see if other transformers are ready to be executed. We cannot
		// only call executeAllTransformers on set and add as setting/adding one col might trigger
		// multiple transformers.
		await this.executeAllTransformers();

	}


	/**
	* Gets next transformer to execute on current row or false
	* @private
	* @returns {object|false} 		Next transformer to execute (with properties transformer and 
	*								data)and its data, if available, else false.
	*/ 
	getNextTransformerToExecute() {
		for (const transformer of this.transformers) {
			// Transformer has already been executed for this row: Don't do so twice
			if (this.wasTransformerExecuted(transformer.transformer)) continue;
			const propertiesForTransformer = this.allPropertiesAvailable(transformer.properties);
			if (!propertiesForTransformer) {
				log('Not all properties available for transformer, continue');
				continue; // Check next transformer
			}
			else {
				const returnValue = {
					transformer: transformer,
					// Data: values in head row for all properties passed (in the same order)
					data: transformer.properties.map((property) => this.head().get(property))
				};
				log('Execute transformer %o with data %o', returnValue.transformer, 
					returnValue.data);
				return returnValue;
			}
		}
		return false;	
	}


	/**
	* Adds results of a transformer to latest row. 
	* @private
	* @param {object} result			Result of the transformer to be added; casted to an object
	*									if a non-object was returned.
	* @param {object} transformer		An entry of this.transformers
	*/
	async addTransformedData(result, transformer) {

		const rowData = new Map();
			
		// Get all keys (symbols an regular properties) from transformer.keys, go through
		// them
		for (const [key] of transformer.keys) {

			// Key returned by getKeys(), but not part of next()'s return value
			if (!result.has(key)) {
				throw new Error(`TransformableDataSeries: Key ${ key } was announced through
					transformer's getKeys() method, but is not part of the object returned
					by the next() method (${ JSON.stringify(result) }).`);
			}
			rowData.set(transformer.keys.get(key), result.get(key));
		}

		// Check if key was not announced by getKeys() but part of next()'s return value
		for (const [key] of result) {
			if (!transformer.keys.has(key)) {
				throw new Error(`TransformableDataSeries: Key ${ key } is present on the Map
					returned by next() method, but was not announced by getKeys().`);
			}			
		}

		log('Add transformed data %o to head row', rowData);
		await this.set(rowData);

	}


	/**
	* Takes a value; if it's a promise, returns it, else returns a promised form of value.
	*
	* @private
	* @param {*} value
	* @returns {Promise}
	*/
	createPromiseFromTransformer(value) {
		if (value && value instanceof Promise) return value;
		// Return a synchronously resolving promise
		// (and not async by creating a new promise and then in the next loop resolving it)
		return Promise.resolve(value);
	}


	/**
	* Adds a transformer. A transformer is an object (or instantiated class) that must contain a 
	* method called next. The next method is called whenever all properties specified are available 
	* for any given row.
	* The next method must return an object or a value which will be merged with the new row.
	* @param {array} properties		Properties to watch; when all properties are available, 
	*								the transformer's next() method will be called. If the array is
	*								empty, transformer.next() will be called before any value is 
	*								added to the data series.
	* @param {object} transformer	Transformer; is an object/instantiated class with a method 
	*								called next(). next() will be called whenever all properties are 
	*								available. Must return either a single value or a Map() that 
	*								will be merged with the current row. If a Map() is returned,
	*								the transformer must also have a method named getKeys() that 
	*								returns an array with all the keys of the Map that will be
	*								returned. We need those keys to return the key mapping not
	*								only when the transformer's next() method is called, but already
	*								when the transformer is added.
	*								The transformer's next() method will be called with the 
	*								following parameters: 
	*								- array of values for the head() row of all properties (see 
	*								  above) passed in.
	*								We use no further parameters (e.g. the whole head row or the
	*								whole data set) to keep our transformers clean. 
	* @returns {object}				An object with keys and their corresponding symbols that will
	* 								be used to attach the transformer's result to the row. If a 
	*								transformer's next method returns { top: 5, bottom: 2}, it must
	* 								implement a method getKeys that returns ['top', 'bottom']. Those
	*								will be transformed to Symbols in the row and this function will
	*								return { topKey: Symbol(), bottomKey: Symbol() } where both 
	*								Symbols are used to access the transformer's result. Using
	*								symbols internally (instead of a passed-in name) allows us to
	*								prevent any key collisions.
	*/
	addTransformer(properties, transformer) {

		if (!Array.isArray(properties)) {
			throw new Error(`TransformableDataSeries: Argument 'properties' must be an array, is
				${ typeof properties }.`);
		}

		if (!transformer || typeof transformer !== 'object') {
			throw new Error(`TransformableDataSeries: The transformer you added through 
				addTransformer must be an object, is of type ${ typeof transformer }.`);
		}

		if (!transformer.next || typeof transformer.next !== 'function') {
			throw new Error(`TransformableDataSeries: Every transformer must have a next method.`);
		}

		// If transformer's next method returns an object, it must have a getKeys method that 
		// returns all the keys of the object that will be returned. If this method is not 
		// not present, just use 'value' as the name. 
		const keys = transformer.getKeys && typeof transformer.getKeys === 'function' ?
			transformer.getKeys() : [this.defaultReturnValuePropertyName];
		// Create a map that maps the next method's object keys to symbol; those symbols will
		// be used to (uniquely) store the results in the TransformableDataSeries.
		const keyMap = new Map();
		keys.forEach((key) => {
			keyMap.set(key, Symbol());
		});

		this.transformers.push({
			properties: properties,
			transformer: transformer,
			keys: keyMap,
		});

		log('Add transformer %o with properties %o and keys %o', transformer, properties, keyMap);

		// Return the map that contains the keys to the symbols used to store the values. Do not
		// use a map but an object to allow object destructuring:
		// const { key1, key2 } = TransformableDataSeries.addTransformer(…);
		const returnValue = {};
		keyMap.forEach((value, key) => returnValue[key] = value);
		return returnValue;

	}

}

