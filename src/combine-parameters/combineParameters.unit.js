import test from 'ava';
import combineParameters from './combineParameters';

function setupData() {
	const params = new Map();
	params.set('a', [1, 2, 3]);
	params.set('b', [4, 5]);
	params.set('c', [6, 7]);
	return { params };
}

test('combines parameters correctly', (t) => {
	const { params } = setupData();
	const result = combineParameters(params);
	t.is(result.length, 12);
	result.forEach((item) => t.is(item.size, 3));
	const expectation = [
		// Use numbers (not arrays) as they can easily be compared (indexOf)
		146,
		147,
		156,
		157,
		246,
		247,
		256,
		257,
		346,
		347,
		356,
		357,
	];
	// Holds all indexes of expeectations that were found
	const usedIndexes = [];
	result.forEach((item) => {
		const asNumber = Number('' + item.get('a') + item.get('b') + item.get('c'));
		usedIndexes.push(expectation.indexOf(asNumber));
	});
	// All 12 expectations indexes should have been used
	t.deepEqual(usedIndexes.sort((a, b) => a - b), 
		Array.from(new Array(12)).map((item, index) => index));
});