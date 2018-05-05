/**
* Creates a data set from shortened data
* @param {object[]} dataSet				Array of objects to create dataSet from:
*                              			- name
*                              			- date (day)
*                              			- open
*                              			- close
*/
export default function createTestData(rawDataSets) {
	// Create Map with date, open, close and instrument
	const bars = rawDataSets.map((convertToBar));
	return bars.slice(0).sort((a, b) => {
		// 1st order: date, 2nd order: name
		if (a.get('date').getTime() === b.get('date').getTime()) {
			return a.get('instrument') < b.get('instrument') ? -1 : 1;
		}
		return a.get('date').getTime() - b.get('date').getTime();
	});
}

function convertToBar(input) {
	return new Map([
		['instrument', input[0]],
		['date', new Date(2018, 0, input[1])],
		['open', input[2]],
		['close', input[3]],
	]);
}