import test from 'ava';
import executeOrders from './executeOrders';

function setupData() {
	const instruments = [{
		name: 'aapl'
	}, {
		name: 'amzn'
	}];
	const prices = new Map([[instruments[0], 3], [ instruments[1], 10]]);
	const positions = new Map();
	positions.set(instruments[0], {
		size: 4,
		value: 12,
		positions: [{
			size: 4,
			value: 12, // Bought @2, now @3 – must correspond to prices!
			openPrice: 2,
		}]
	});
	return { instruments, prices, positions };
}

test('does not order if there\'s no data for an instrument (position exsists)', (t) => {
	const { positions, instruments } = setupData();
	const result = executeOrders(positions, [{ size: 10, instrument: instruments[0] }], new Map(),
		100);
	const originalPositions = setupData().positions;
	t.deepEqual(result, originalPositions);
});

test('does not order if there\'s no data for an instrument (position doesn\'t exsist)', (t) => {
	const { positions, prices } = setupData();
	const originalPositions = setupData().positions;
	const result = executeOrders(positions, [{ size: 10, instrument: { name: 'no' } }], prices,
		100);
	t.deepEqual(result, originalPositions);
});

test('frees money first, then spends it; does not execute if cash is tight', (t) => {
	const { positions, prices, instruments } = setupData();
	const result = executeOrders(
		positions, 
		// Smaller position comes last – should be turned
		// Value of first order is 100, value of second 30
		[{ size: 10, instrument: instruments[1] }, { size: 10, instrument: instruments[0] }],
		prices,
		50
	);
	t.is(result.size, 1);
	t.is(result.get(instruments[0]).size, 14);
	t.is(result.get(instruments[0]).value, 42);
});




test('does not change original data', (t) => {
	const { positions, prices, instruments } = setupData();
	const orders = [
		{ size: 10, instrument: instruments[1] }, 
		{ size: 10, instrument: instruments[0] },
	];
	const originalOrders = JSON.parse(JSON.stringify(orders));
	executeOrders(positions, orders, prices, 50);
	t.deepEqual(orders, originalOrders);
	t.deepEqual(positions, setupData().positions);
	t.deepEqual(prices, setupData().prices);
	t.deepEqual(instruments, setupData().instruments);
});


