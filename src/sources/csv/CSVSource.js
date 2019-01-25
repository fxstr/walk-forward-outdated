import csv from 'fast-csv';
import logger from '../../logger/logger';
import { getPathsFromSpecs } from './specToPath';

const { debug } = logger('WalkForward:CSVSource');

/**
* Reads multiple CSV files and returns the result. Accepts globs as path specifiers.
*/
export default class CSVSource {

	pathSpecs = [];
	csvOptions = {
		headers: true,
	}

	/**
	* @param {array|string} pathSpecs		Paths to CSVs to read; you may use glob patterns
	*/
	constructor(pathSpecs) {

		if (typeof pathSpecs === 'string') {
			this.pathSpecs = [pathSpecs];
		}
		else if (Array.isArray(pathSpecs)) {
			this.pathSpecs = pathSpecs;
		}
		else {
			throw new Error(`CSVSource: First argument must be an array of paths or a
				string, is '${ JSON.stringify(pathSpecs) }'.`);
		}

	}


	/**
	* Reads all files that match a path specified in this.pathSpecs, converts it to a 
	* DataSeries and resolves promise with all dataSeries
	* Don't use an async function as the promise it returns won't be the same as the one
	* stored in this.readPromise (?), which is a requirement in our tests (maybe it's a babel 
	* issue)
	* @returns {Promise}		Promise that resolves to an array where every file read 
	* 							is an item and contains two properties: file (string) and content
	*							(array of objects)
	*/
	read() {
		// If we're already reading, don't start a new read, just return the existing promise.
		// This is especially important as multiple read calls might be made if we optimize
		// a backtest with different variables (one call per run might be made).
		if (this.allRead) return Promise.resolve(false);
		if (this.readPromise) return this.readPromise;
		this.readPromise = new Promise((resolve, reject) => {
			this.readInternally().then((result) => {
				debug('Read internally, result is', result);
				this.allRead = true;
				this.readPromise = undefined;
				resolve(result);
			}, reject);
		});
		debug('Reading files, return promise');
		return this.readPromise;
	}


	/**
	* Does actually read the files; is masked by read which makes sure that we don't read
	* multiple times by returning the read promise if it exists
	* @private
	*/
	async readInternally() {
		const allFiles = await getPathsFromSpecs(this.pathSpecs);
		debug('Read files %o', allFiles);
		const promises = allFiles.map(async (file) => {
			const fileContent = await this.readFile(file);
			return {
				file: file,
				content: fileContent,
			};
		});
		return Promise.all(promises);

	}


	/**
	* Reads a single file and converts it into a DataSeries
	* @param {string} path		Path to the file that should be read
	* @returns promise
	*/
	readFile(path) {
	
		debug('Read file %s', path);

		let content = [];
		return new Promise((resolve, reject) => {
			csv
				.fromPath(path, this.csvOptions)
				.on('data', (data) => {
					content = content.concat(data);
				})
				.on('end', () => {
					debug('File %s completely read', path);
					resolve(content);
				})
				.on('data-invalid', (err) => {
					debug('Reading file %s failed: %o', path, err);
					reject(new Error(err));
				})
				.on('error', (err) => {
					debug('Reading file %s failed: %o', path, err);
					reject(new Error(err));
				});
		});

	}

}

