import csv from 'fast-csv';
import fs from 'fs';

export default class CSVSource {

	/**
	* @param {array} paths		Paths to CSVs to read
	*/
	constructor(paths) {

		if (!Array.isArray(paths)) {
			throw new Error(`CSVSource: First argument must be an array of paths, is '${ paths }'.`);
		}

		const missingPath = paths.find((path) => !fs.existsSync(path));
		if (missingPath) {
			throw new Error(`CSVSource: File ${ missingPath } does not exist.`);
		}
	}

	read() {
		
	}

}