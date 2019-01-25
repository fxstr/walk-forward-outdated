import CSVSource from './CSVSource';
import logger from '../../logger/logger';
const { debug } = logger('WalkForward:BacktestCSVSource');


/**
* Wrapper around CSVSource that formats CSV's data for use with backtests:
* - file name becomes instrument name
* - date becomes a date
* - numbers become reeeeeal numbers …
*/
export default class BacktestCSVSource extends CSVSource {

	constructor(instrumentNameFunction, ...args) {
		super(...args);

		if (typeof instrumentNameFunction !== 'function') {
			throw new Error(`BacktestCSVSource: Pass a function that extracts the instrument's name
				from the file name as first argument of constructor.`);
		}
		this.instrumentNameFunction = instrumentNameFunction;
	}

	/**
	* Read file (CSVSource), then re-format data retrieved
	*/
	async read(...args) {
		// https://github.com/babel/babel/issues/3930 (no super() on async methods)
		debug('Read files %s', this.pathSpecs.join(', '));
		return CSVSource.prototype.read.apply(this, args).then((result) => {
			if (result === false) return false;
			const formatted = result.map((fileContent) => this.formatFile(fileContent));
			// Flatten array – content of all files goes into one single array (as needed by
			// DataGenerator)
			const flattened = formatted.reduce((prev, item) => prev.concat(item), []);
			debug('Formatted and flattened content returned by read is %o', flattened);
			return flattened;
		});
	}

	/**
	* Re-formats a file
	*/
	formatFile(fileContent) {
		const instrument = this.instrumentNameFunction(fileContent.file);
		debug('Get instrument name for file %s, is %s', fileContent.file, instrument);
		return fileContent.content.map((rowContent) => {
			return this.formatRow(rowContent, instrument);
		});
	}

	/**
	* Formats a single CSV row to the format matching Backtest
	*/
	formatRow(rowContent, instrument) {
		debug('Format row %o for instrument %s', rowContent, instrument);
		if (!instrument) {
			throw new Error(`BacktestCSVSource: Instrument not provided (maybe you passed an
				instrumentNameFunction that does not work as expected).`);
		}
		if (!rowContent.date) {
			throw new Error(`BacktestCSVSource: Data does not contain a date field.`);
		}
		const formatted = new Map();
		formatted.set('instrument', instrument);
		// Go through all properties of rowContent; convert all to numbers except date which
		// becomes a new Date().
		Object.keys(rowContent).forEach((key) => {
			if (key === 'date') formatted.set(key, new Date(rowContent[key]));
			else formatted.set(key, Number(rowContent[key]));
		});
		return formatted;
	}

}
