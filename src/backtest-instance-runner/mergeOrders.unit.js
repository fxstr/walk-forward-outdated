import test from 'ava';
import mergeOrders from './mergeOrders';

test('', (t) => {
	const orders = [
		{ instrument: 'aapl', size: 3 },
		{ instrument: 'aapl', size: -2 },
		{ instrument: '0700', size: 1 },
		{ instrument: 'aapl', size: 5 },
	];
	t.deepEqual(mergeOrders(orders), [
		{ instrument: 'aapl', size: 6 },
		{ instrument: '0700', size: 1 },
	]);
});