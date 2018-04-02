import test from 'ava';
import sortOrdersBySizeChange from './sortOrdersBySizeChange';

test('', (t) => {
	const key = Symbol();
	const orders = [{
			instrument: {
				[key]: 5,
				name: 'aapl',
			},
			size: -20, // Larger
		}, {
			instrument: {
				[key]: 15,
				name: 'aapl',
			},
			size: -5, // Smaller
		}, {
			instrument: {
				[key]: 50,
				name: 'aapl',
			},
			size: -100, // Same
		}
	];
	const sorted = sortOrdersBySizeChange(orders, key);
	t.deepEqual(sorted, [orders[1], orders[2], orders[0]]);
});