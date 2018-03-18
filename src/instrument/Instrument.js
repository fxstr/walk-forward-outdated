import TransformableDataSeries from '../data-series/TransformableDataSeries';

/**
* Represents any tradable/backtestable instrument
*/
export default class Instrument {

	data = new TransformableDataSeries();

	/**
	* @param {string} name
	*/
	constructor(name) {
		if (!name || typeof name !== 'string') throw new Error(`Instrument: Pass the name (string) 
			as first argument to constructor.`);
		this.name = name;
	}

	/**
	* Adds data to the instrument
	*/
	async addData(...data) {
		await this.data.add(...data);
	}

}