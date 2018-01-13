import CSVSource from './CSVSource';
import debug from 'debug';
const log = debug('WalkForward:BacktestCSVSource');


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
		// https://github.com/babel/babel/issues/3930
		return CSVSource.prototype.read.apply(this, args).then((result) => {
			return result.map((fileContent) => this.formatFile(fileContent));
		});
	}

	/**
	* Re-formats a file
	*/
	formatFile(fileContent) {
		const instrument = this.instrumentNameFunction(fileContent.file);
		log('Instrument is %s', instrument);
		return fileContent.content.map((rowContent) => {
			return this.formatRow(rowContent, instrument);
		});
	}

	/**
	* Formats a single CSV row to the format matching Backtest
	*/
	formatRow(rowContent, instrument) {
		log('Format row %o for instrument %s', rowContent, instrument);
		if (!instrument) {
			throw new Error(`BacktestCSVSource: Instrument not provided (maybe you passed an
				instrumentNameFunction that does not work as expected).`);
		}
		if (!rowContent.date) {
			throw new Error(`BacktestCSVSource: Data does not contain a date field.`);
		}
		const formatted = {
			instrument: instrument,
		};
		// Go through all properties of rowContent; convert all to numbers except date which
		// becomes a new Date().
		Object.keys(rowContent).forEach((key) => {
			if (key === 'date') formatted[key] = new Date(rowContent[key]);
			else formatted[key] = Number(rowContent[key]);
		});
		return formatted;
	}

}
