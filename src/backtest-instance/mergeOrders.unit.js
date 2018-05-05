import test from 'ava';
import mergeOrders from './mergeOrders';

function setupData() {
	const orders = [
		{ instrument: 'aapl', size: 3 },
		{ instrument: 'aapl', size: -2 },
		{ instrument: '0700', size: 1 },
		{ instrument: 'aapl', size: 5 },
	];
	return { orders };
}

test('merges orders', (t) => {
	const { orders } = setupData();
	t.deepEqual(mergeOrders(orders), 
		[{ instrument: 'aapl', size: 6 }, { instrument: '0700', size: 1 }]
	);
});

test('does not modify original orders', (t) => {
	const { orders } = setupData();
	const orderCopy = JSON.parse(JSON.stringify(orders));
	mergeOrders(orders);
	t.deepEqual(orders, orderCopy);
});