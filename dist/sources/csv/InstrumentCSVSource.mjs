import GenericCSVSource from './GenericCSVSource';
import logger from '../../logger/logger';
const {
  debug
} = logger('WalkForward:InstrumentCSVSource');
/**
* Wrapper around CSVSource that formats CSV's data for use with backtests:
* - file name becomes instrument name
* - date becomes a date
* - numbers become reeeeeal numbers …
*/

export default class InstrumentCSVSource extends GenericCSVSource {
  /**
   * @param  {function}    instrumentNameFunction     Function that takes the file name as an
   *                                                  input and returns the instrument's name as
   *                                                  a string
   */
  constructor(instrumentNameFunction, ...args) {
    super(...args);

    if (typeof instrumentNameFunction !== 'function') {
      throw new Error(`InstrumentCSVSource: Pass a function that extracts the instrument's name from the file name as first argument of constructor, is ${instrumentNameFunction}.`);
    }

    this.instrumentNameFunction = instrumentNameFunction;
  }
  /**
  * Read file (CSVSource), then re-format data retrieved.
  * @returns {Promise}        Promise that resolves to flattened data: An array with an item per
  *                           CSV row as a Map.
  */


  async read(...args) {
    debug('Read files %s', this.pathSpecs.join(', ')); // https://github.com/babel/babel/issues/3930 (no super() on async methods)

    return GenericCSVSource.prototype.read.apply(this, args).then(result => {
      if (result === false) return false;
      const formatted = result.map(fileContent => this.formatFile(fileContent)); // Flatten array – content of all files goes into one single array (as needed by
      // DataGenerator)

      const flattened = formatted.reduce((prev, item) => prev.concat(item), []);
      debug('Formatted and flattened content returned by read is %o', flattened);
      return flattened;
    });
  }
  /**
  * Re-formats a file
  * @returns {Map[]}      One array item per CSV line, formatted according to this.formatRow()
  */


  formatFile(fileContent) {
    const instrument = this.instrumentNameFunction(fileContent.file);
    debug('Get instrument name for file %s, is %s', fileContent.file, instrument);
    return fileContent.content.map(rowContent => this.formatRow(rowContent, instrument));
  }
  /**
  * Formats a single CSV row to the format matching Backtest.
  * @returns {Map}        Map that contains at least the keys 'date' {Date} and
  *                       'instrument' {String} as well as all other CSV columns as {Number}
  */


  formatRow(rowContent, instrument) {
    debug('Format row %o for instrument %s', rowContent, instrument);

    if (!instrument) {
      throw new Error(`InstrumentCSVSource: Instrument not provided (maybe you passed an instrumentNameFunction that does not work as expected), is ${instrument}.`);
    }

    if (!rowContent.date) {
      throw new Error(`InstrumentCSVSource: Data does not contain a date field, is ${JSON.stringify(rowContent)}.`);
    }

    const formatted = new Map();
    formatted.set('instrument', instrument); // Go through all properties of rowContent; convert all to numbers except date which
    // becomes a new Date().

    Object.keys(rowContent).forEach(key => {
      if (key === 'date') formatted.set(key, new Date(rowContent[key]));else formatted.set(key, Number(rowContent[key]));
    });
    return formatted;
  }

}
//# sourceMappingURL=InstrumentCSVSource.mjs.map