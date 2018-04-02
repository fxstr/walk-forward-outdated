// [dayOfMonth, open, close]
/*const aapl = [
	[1, 10, 12],
	[2, 11, 13],
	[3, 9, 10],
	[4, 11, 9],
	[5, 11, 10],
	[8, 10, 12],
	[9, 14, 12],
	[10, 14, 15],
	[11, 12, 12],
	[13, 13, 14],
];
const amzn = [
	[1, 20, 22],
	[2, 21, 23],
	[4, 19, 20],
	[5, 21, 19],
	[6, 21, 20],
	[7, 20, 22],
	[9, 24, 22],
	[11, 24, 25],
	[12, 22, 22],
	[14, 23, 24],
];*/

/**
* Creates a data set from shortened data
* @param {array} dataSet[]			Array of an array of 3 numbers (date, open, close)
* @param {string} instrumentName	e.g. 'aapl'
*/
export default function createTestData(rawDataSets) {
	// Create Map with date, open, close and instrument
	const dataSets = rawDataSets.map((dataSet) => {
		const bars = dataSet.data.map(convertToBar);
		bars.forEach((item) => item.set('instrument', dataSet.instrument));
		return bars;
	});
	const bars = [].concat(...dataSets);
	return bars.sort((a, b) => {
		// 1st order: date, 2nd order: name
		if (a.get('date').getTime() === b.get('date').getTime()) {
			return a.get('instrument') < b.get('instrument') ? -1 : 1;
		}
		return a.get('date').getTime() - b.get('date').getTime();
	});
}

function convertToBar(input) {
	return new Map([
		['date', new Date(2018, 0, input[0])],
		['open', input[1]],
		['close', input[2]],
	]);
}