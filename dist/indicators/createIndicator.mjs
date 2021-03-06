function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import logger from '../logger/logger';
const {
  debug
} = logger('WalkForward:createIndicator');
/**
 * A factory function that creates indicators from tulind
 */

export default function createIndicator(indicatorConfig) {
  var _class, _temp;

  return _temp = _class = class {
    /**
     * Needed for chartConfigs
     * @private
     */
    // We'll store past values in this.history as options (e.g. sma length) might change and 
    // previous values might be required to calculate the result.
    // Create one item per input needed
    constructor(...args) {
      _defineProperty(this, "history", Array.from({
        length: indicatorConfig.inputs
      }).map(() => []));

      if (args.length !== indicatorConfig.options) {
        throw new Error(`Indicators/${indicatorConfig.name}: Number of constructor  
                    arguments required: ${indicatorConfig.options}, arguments provided: 
                    ${args.join(', ')}, expected ${indicatorConfig.option_names.join(', ')}.`);
      } // Store options


      this.options = args;
    }
    /**
     * Add number(s) to indicator, then call it
     * @param  {values} values     number
     * @return {Promise}           Resolves to a single value if the indicator returns a single
     *                             value, else returns to a map: new Map([[output_name, value]])
     */


    next(...values) {
      // Test number of arguments passed
      if (values.length !== indicatorConfig.inputs) {
        throw new Error(`Indicators/${indicatorConfig.name}: Arguments passed to
                    next(): ${values.join(', ')}, expected: 
                    ${indicatorConfig.input_names.join(', ')}.`);
      } // Add value to history: History is an array A of arrays B where one array A is created
      // per value passed.


      values.forEach((value, index) => this.history[index].push(value));
      return new Promise((resolve, reject) => {
        indicatorConfig.indicator(this.history, this.options, (err, results) => {
          debug('next() called on %s', this.constructor.identifier);
          if (err) reject(err); // tulip returns an array of results, going back in time; just return the 
          // most recent result or undefined for every output gotten.

          const latestResult = results.map(result => {
            return result.length ? result[result.length - 1] : undefined;
          }); // If indicator returns just one value, return it directly.

          if (latestResult.length === 1) return resolve(latestResult[0]); // Convert array to a map where the keys are the names and the values the 
          // values, e.g. new Map([['stoch_k', 3], ['stoch_d', 2]])

          const resultMap = latestResult.reduce((prev, item, index) => {
            prev.set(indicatorConfig.output_names[index], item);
            return prev;
          }, new Map());
          resolve(resultMap);
        });
      });
    }

  }, _defineProperty(_class, "identifier", indicatorConfig.name), _temp;
}
//# sourceMappingURL=createIndicator.mjs.map