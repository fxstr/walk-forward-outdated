function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import combineParameters from '../combine-parameters/combineParameters';
import { generateLogarithmicParameters } from '../generate-parameters/generateParameters';
import logger from '../logger/logger';
const {
  debug
} = logger('WalkForward:Optimization');
export default class Optimization {
  constructor() {
    _defineProperty(this, "parameterConfigs", new Map());
  }

  /**
  * Add a configuration for a parameter that should be optimized
  * @param {string} name			Name of the parameter
  * @param {number[]} bounds		Boundaries (from/to) for parameters
  * @param {number} steps			Number of param values to generate
  * @param {string} type			'log' or 'lin'
  * @param {object} config		Configuration for the parameter. For accepts 'logBase' if type 
  *								is 'log'
  */
  addParameter(name, bounds, steps = 10, type = 'log', config = {}) {
    if (!name || typeof name !== 'string') throw new Error(`Optimization: First parameter (name) 
			must be a name (string), is ${typeof name}.`);
    if (!bounds || !Array.isArray(bounds) || bounds.length !== 2 || typeof bounds[0] !== 'number' || typeof bounds[1] !== 'number' || bounds[1] <= bounds[0]) throw new Error(`Optimization: Second parameter (boundaries) 
			must be an array consisting of two numbers.`);
    if (typeof steps !== 'number') throw new Error(`Optimization: Third parameter (number of 
			steps) must be a number.`);
    if (!(type === 'log'
    /*|| type === 'lin'*/
    )) throw new Error(`Optimization: Fourth parameter
			(type) must be 'log'.`);
    if (typeof config !== 'object') throw new Error(`Optimization: Fifth parameter must be
			a configuration object.`);
    if (this.parameterConfigs.get(name)) console.warn(`Optimization: You're overwriting an 
			existing parameter ${name}.`);
    this.parameterConfigs.set(name, {
      bounds,
      steps,
      type,
      config
    });
  }
  /**
  * Generates all possible parameter combinations
  * @returns {Map[]}		All possible parameter sets
  */


  generateParameterSets() {
    // Convert parameters into Maps with key: name, value: array of values
    const valueMap = new Map();
    Array.from(this.parameterConfigs).forEach(config => {
      valueMap.set(config[0], this.getValuesForParameter(config[1]));
    });
    const result = combineParameters(valueMap);
    debug('Parameter sets for %o are %o', valueMap, result);
    return result;
  }
  /**
  * Converts parameter configuration into parameters
  * @param {parameterConfig}		Value of this.parameterConfig
  * @returns {array}				Parameter values for the given config
  * @private
  */


  getValuesForParameter(parameterConfig) {
    if (parameterConfig.type === 'log') return generateLogarithmicParameters(parameterConfig.bounds[0], parameterConfig.bounds[1], parameterConfig.steps, parameterConfig.config.logBase);
  }

}
//# sourceMappingURL=Optimization.mjs.map