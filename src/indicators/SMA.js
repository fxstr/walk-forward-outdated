import tulind from 'tulind';

/**
* Wrapper around tulip's SMA indicator to work as a transformer for a TransformableDataSeries.
*/
export default class SMA {
	
	allValues = [];

	constructor(length) {
		if (isNaN(length)) throw new Error(`Pass in one parameter as a constructor which is a 
			number.`);
		this.length = length;
	}

	async next(data) {
		if (data.length !== 1) throw new Error(`SMA: Pass in exactly one property; you used 
			${ data.length } properties.`);
		// Store all values as this.length might change on runtime
		this.allValues.push(data);
		// Return null if not enough data is available
		if (this.allValues.length < this.length) return undefined;
		// Calculate indicator
		const promise = new Promise((resolve, reject) => {
			tulind.indicators.sma.indicator(
				[this.allValues.slice(this.length * -1)],
				[this.length],
				(err, result) => {
					if (err) reject(err);
					resolve(result[0][0]);
				}
			);
		});
		await promise;
		return promise;
	}

}