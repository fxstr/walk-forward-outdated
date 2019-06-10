function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import DataSeries from './DataSeries';
import logger from '../logger/logger';
import convertObjectToMap from './convertObjectToMap';
const {
  debug
} = logger('WalkForward:TransformableDataSeries');
/**
* Extends DataSeries with transformers.
*/

export default class TransformableDataSeries extends DataSeries {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "transformers", []);

    _defineProperty(this, "executedTransformers", []);

    _defineProperty(this, "defaultReturnValuePropertyName", 'value');
  }

  /**
  * Adds one or multiple data values for a given key. Only one row (key) may be passed. *After*
  * the row is added, registered transformers are executed.
  * @param {object} data
  * @returns {Promise}
  */
  async add(data) {
    // Re-start transform process
    this.resetExecutedTransformers(); // If there are transformers with *no* dependencies, execute them before any data is added
    // (this is a question of definition, could also be done after add is executed)
    // To do so, we 
    // - first create an empty entry (with an empty Map())
    // - then execute the transformers without dependencies
    // - then add the data (through set)
    // Super is not supported on async functions in babel, see 
    // https://github.com/babel/babel/issues/3930

    DataSeries.prototype.add.call(this, new Map());
    await this.executeAllTransformers(); // set executes all transformers – no need to do it here.

    await this.set(data);
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
    } // Any one property is missing: Return false


    if (!properties.every(property => headRow.has(property))) return false; // Create partial row object and return it

    return properties.map(property => headRow.get(property));
  }
  /**
  * Executes all transformers; when new values become available, starts at the beginning
  * @private
  */


  async executeAllTransformers() {
    const nextExecution = this.getNextTransformerToExecute(); // All done

    if (!nextExecution) return;
    const {
      transformer,
      data
    } = nextExecution; // For params of next(), see addTransformer; DO NOT PASS more data if not absolutely needed
    // as we want to have stateless/simple transformers

    const transformerResult = await transformer.transformer.next(...data);
    debug('Executed transformer; result is %o, data was %o', transformerResult, data);
    this.executedTransformers.push(transformer.transformer);
    await this.addTransformedData(transformerResult, transformer); // Do the next round and see if other transformers are ready to be executed. We cannot
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
        debug('Not all properties available for transformer, continue');
        continue; // Check next transformer
      } else {
        const returnValue = {
          transformer: transformer,
          // Data: values in head row for all properties passed (in the same order)
          data: transformer.properties.map(property => this.head().get(property))
        };
        debug('Execute transformer %o with data %o', returnValue.transformer.constructor.name, returnValue.data);
        return returnValue;
      }
    }

    return false;
  }
  /**
  * Adds results of a transformer to latest row. 
  * @private
  * @param {*} result					Result of the transformer to be added; may be an object or
  *                       			Map (if it contains multiple cols) or anything else (if it's
  *                       			a single col).
  * @param {object} transformer		An entry of this.transformers
  */


  async addTransformedData(result, transformer) {
    // Data to add to current row
    const rowData = new Map(); // Get columns that are added to DataSeries; when they are created, description is set
    // if tranformer has a getDescription() method.

    const newCols = []; // Result is an object (and not a Map): Convert it to a Map for easier handling

    if (typeof result === 'object' && result !== null && !(result instanceof Map)) {
      const result = convertObjectToMap(result);
    } // Result is a map: Change key from key passed by transformer to key passed to 
    // addTransformer


    if (result instanceof Map) {
      for (const [key, value] of result) {
        if (transformer.keys[key] === undefined) {
          throw new Error(`TransformableDataSeries: You need to specify a key for every 
						result a transformer returns (as an argument for addTransformer()). 
						The key for ${key} is missing.`);
        }

        rowData.set(transformer.keys[key], value);
      }
    } // Result is something else than an object or a Map: Convert it to a map with a single 
    // entry.
    else {
        if (!transformer.keys) throw new Error(`TransformableDataSeries: Single key missing.`);
        rowData.set(transformer.keys, result);
      } // Add keys to columns (if not done yet)


    for (const [resultKey] of rowData) {
      if (!this.columns.has(resultKey)) newCols.push(resultKey);
    }

    debug('Add transformed data %o to head row', rowData);
    await this.set(rowData); // Better solution: Use something like setColConfig in DataSeries so that we can config
    // dataSeries before they're used.
    //this.updateColumnDefinitions(newCols, transformer.transformer);
  }
  /**
   * When a column is newly added, we try to get the column's description text from the 
   * transformer that was used to create the column value.
   * @param {array} columns  			Columns that were just created
   * @param {object} transformer		Transformer that was used to create the column; may contain
   *                              	a getDescription() property
   */

  /*updateColumnDefinitions(columns, transformer) {
  	if (typeof transformer.getDescription !== 'function') return;
  	const description = transformer.getDescription();
  	}*/

  /**
  * Takes a value; if it's a promise, returns it, else returns a promised form of value.
  *
  * @private
  * @param {*} value
  * @returns {Promise}
  */

  /*createPromiseFromTransformer(value) {
  	if (value && value instanceof Promise) return value;
  	// Return a synchronously resolving promise
  	// (and not async by creating a new promise and then in the next loop resolving it)
  	return Promise.resolve(value);
  }*/

  /**
  * Adds a transformer. A transformer is an object (or instantiated class) that must contain a 
  * method called next. The next method is called whenever all properties specified are available 
  * for any given row.
  * The next method must return an object or a value which will be merged with the new row.
  * @param {array} properties		Properties to watch; when all properties are available, 
  *								the transformer's next() method will be called. If the array is
  *								empty, transformer.next() will be called before any value is 
  *								added to the data series (therefore with an empty data series). 
  *								This is amongst others needed to clone previous values (e.g.
  *								positions – is it?).
  * @param {object} transformer	Transformer; is an object/instantiated class with a method 
  *								called next(). next() will be called whenever all properties are 
  *								available. Must return either a single value or a Map() that 
  *								will be merged with the current row. 
  *								The transformer's next() method will be called with the 
  *								following parameters: 
  *								- array of values for the head() row of all properties (see 
  *								  above).
  *								We use no further parameters (e.g. the whole head row or the
  *								whole data set) to keep our transformers clean. 
  * @param {object|*} keys		Keys that we use to store the transformer's return values in 
  *                         		this DataSeries. If tranformer returns a single value, pass 
  *                         		anything that can be used as a key in a Map(). If transformer 
  *                         		returns multiple values (as an object), pass an object; keys
  *                         		are the keys of the object returned by the transformer, values
  *                         		the keys used to store the value in this DataSeries. Try to use
  *                         		Symbols() as the whole idea of using keys is to prevent clashes
  *                         		of keys. 
  *                         		(In an earlier version, we created Symbols() as keys and 
  *                         		returned the mapping. This made things too complicated (in Algos
  *                         		where we had to store multiple keys for multiple instruments). 
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


  addTransformer(properties, transformer, keys) {
    if (!Array.isArray(properties)) {
      throw new Error(`TransformableDataSeries: Argument 'properties' for addTransformer 
				must be an array, is ${typeof properties}.`);
    }

    if (!transformer || typeof transformer !== 'object') {
      throw new Error(`TransformableDataSeries: The transformer you added through 
				addTransformer must be an object, is of type ${typeof transformer}.`);
    }

    if (!transformer.next || typeof transformer.next !== 'function') {
      throw new Error(`TransformableDataSeries: Every transformer must have a next method.`);
    }

    this.transformers.push({
      properties: properties,
      transformer: transformer,
      keys: keys
    });
    debug('Add transformer %o with properties %o and keys %o', transformer, properties, keys);
  }

}
//# sourceMappingURL=TransformableDataSeries.mjs.map