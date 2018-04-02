import TransformableDataSeries from '../data-series/TransformableDataSeries';

/**
* Represents any tradable/backtestable instrument
*/
export default class Instrument extends TransformableDataSeries {

	/**
	* @param {string} name
	*/
	constructor(name) {
		super();
		if (!name || typeof name !== 'string') throw new Error(`Instrument: Pass the name (string) 
			as first argument to constructor.`);
		this.name = name;
	}

}