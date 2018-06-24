import ViewableDataSeries from '../data-series/ViewableDataSeries';

/**
* Represents any tradable/backtestable instrument
*/
export default class Instrument extends ViewableDataSeries {

    /**
     * TODO: Check if all required fields (OHLC + date) are available – if they're not we'll run 
     * into problems later
     */
    /*add(data) {
        // Check object and Map
        super.add(data);
    }*/

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