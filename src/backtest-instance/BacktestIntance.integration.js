import test from 'ava';
import createTestData from '../helpers/createTestData';
import BacktestInstance from './BacktestInstance';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import Instrument from '../instrument/Instrument';

const baseData = [['aapl', 1, 10, 11]];

/**
 * Creates test data from an array
 * @param  {array} rawInstrumentData	Array with objects, each object containing a property 
 *                                   	instrument (string) and data (date, open, close)
 * @return {object}
 */
function setupData(rawInstrumentData = baseData) {
	const data = createTestData(rawInstrumentData);
	let currentIndex = 0;
	function* dataGenerator() {
		while (currentIndex < data.length) {
			yield data[currentIndex++];
		}
	}

	const instruments = new BacktestInstruments(dataGenerator, true);
	const config = new Map([['cash', () => 50]]);

	return { dataGenerator, instruments, config };
}


test('fails if orders is not an array', async (t) => {
	function orderGenerator() {
		return 'invalid';
	}
	const { instruments, config } = setupData();
	const bt1 = new BacktestInstance(instruments, { onClose: orderGenerator }, config);
	const err = await t.throws(bt1.run());
	t.is(err.message.indexOf('returned invalid orders') > -1, true);
});


test('fails if order data is not valid', async (t) => {
	const { instruments, config } = setupData();
	// Invalid size
	function orderGenerator1() {
		return [{ size: 'name' }];
	}
	// Instrument missing
	function orderGenerator2() {
		return [{ size: 2 }];
	}
	// Size missing
	function orderGenerator3() {
		return [{ instrument: 2 }];
	}
	const bt1 = new BacktestInstance(instruments, { onClose: orderGenerator1 }, config);
	const err1 = await t.throws(bt1.run());
	const bt2 = new BacktestInstance(instruments, { onClose: orderGenerator2 }, config);
	const err2 = await t.throws(bt2.run());
	const bt3 = new BacktestInstance(instruments, { onClose: orderGenerator3 }, config);
	const err3 = await t.throws(bt3.run());
	t.is(err1.message.indexOf('which is a number') > -1, true);
	t.is(err2.message.indexOf('which is a number') > -1, true);
	t.is(err3.message.indexOf('which is a number') > -1, true);
});


test('calls orderGenerator with corret parameters', async (t) => {
	let orderGeneratorParams;
	function orderGenerator(...params) {
		orderGeneratorParams = params;
		return [];
	}
	const { instruments, config } = setupData();
	const bt = new BacktestInstance(instruments, { onClose: orderGenerator }, config);
	await bt.run();
	t.is(orderGeneratorParams.length, 4);
	// First param: orders (empty array)
	t.deepEqual(orderGeneratorParams[0], []);
	// Second param: Instrument
	t.is(orderGeneratorParams[1] instanceof Instrument, true);
	t.is(orderGeneratorParams[1].head().get('open'), 10);
	t.is(orderGeneratorParams[1].head().get('close'), 11);
	t.deepEqual(orderGeneratorParams[1].head().get('date'), new Date(2018, 0, 1));
	t.deepEqual(orderGeneratorParams[1].name, 'aapl');
	// Third param: Instruments
	t.is(Array.isArray(orderGeneratorParams[2]), true);
	t.is(orderGeneratorParams[2].length, 1);
	t.is(orderGeneratorParams[2][0] instanceof Instrument, true);
	// Fourth param: backtest
	t.is(orderGeneratorParams[3].accounts.tail().get('cash'), 50);
});



test('awaits orderGenerator', async (t) => {
	const rawData = [
		['aapl', 1, 10, 11],
		['aapl', 2, 12, 13],
	];
	let called = 0;
	function orderGenerator(orders, instrument) {
		return new Promise((resolve) => setTimeout(() => {
			called++;
			resolve([{ instrument: instrument, size: 1 }]);
		}), 10);
	}
	const { instruments } = setupData(rawData);
	const config = new Map([['cash', () => 1000]]);
	const bt = new BacktestInstance(instruments, { onClose: orderGenerator }, config);
	await bt.run();
	t.is(called, 2);
});



test('calls onNewInstrument when they are initialized', async (t) => {

	const rawData = [
		['aapl', 1, 3, 2],
		['0700', 3, 2, 3],
		['aapl', 3, 3, 4],
	];

	const events = [];
	const runner = { 
		onClose: (order, instrument) => {
			events.push({ type: 'close', instrument: instrument });
			return []; 
		},
		onNewInstrument: (instrument) => {
			events.push({ type: 'newInstrument', instrument: instrument });
		}
	};

	const { instruments, config } = setupData(rawData);
	const bt = new BacktestInstance(instruments, runner, config);
	await bt.run();

	t.is(events.length, 5);
	t.is(events[0].type, 'newInstrument');
	t.is(events[0].instrument.name, 'aapl');
	t.is(events[2].type, 'newInstrument');
	t.is(events[2].instrument.name, '0700');

});



// Detailed tests are done in executeOrders – just test that results are handled correctly
/*test('creates positions (for a single instrument)', async (t) => {
	const rawData = [
			['aapl', 1, 10, 11],
			['aapl', 2, 12, 13],
			['aapl', 3, 11, 15],
			['aapl', 4, 13, 13],
		];
	function orderGenerator(orders, instrument) {
		const date = instrument.head().get('date').getDate();
		if (date === 1) return [...orders, { instrument: instrument, size: 1 }];
		if (date === 2) return [...orders, { instrument: instrument, size: -2 }];
		if (date === 3) return [...orders, { instrument: instrument, size: 1 }];
		return [];
	}
	const { instruments } = setupData(rawData);
	const config = new Map([['cash', () => 1000]]);
	const bt = new BacktestInstance(instruments, orderGenerator, config);
	await bt.run();
	// One entry is made for every trade – when buying aapl & amzn on jan 2, one entry is made
	// for each of those trades.
	const pos = bt.positions.data;
	t.is(pos.length, 4);
	t.deepEqual(pos[0], { key: new Date(2018, 0, 1), data: new Map() });
	t.deepEqual(pos[1], { 
		key: new Date(2018, 0, 2), 
		data: new Map([[instruments.instruments[0], 1]]),
	});
	t.deepEqual(pos[2], {
		key: new Date(2018, 0, 3),
		data: new Map([[instruments.instruments[0], -1]]),
	});
	t.deepEqual(pos[3], {
		key: new Date(2018, 0, 4),
		data: new Map([[instruments.instruments[0], 0]]),
	});
});


test('calculates accounts (cash, positions and total)', async (t) => {
	const rawData = [
			['aapl', 1, 10, 11],
			['aapl', 2, 12, 13],
			['aapl', 3, 11, 15],
			['aapl', 4, 9, 12],
			['amzn', 1, 1, 3],
			['amzn', 2, 3, 4],
			['amzn', 3, 2, 3],
			['amzn', 4, 3, 4],
			['amzn', 5, 2, 1],
		];
	function orderGenerator(orders, instrument) {
		const date = instrument.head().get('date').getDate();
		if (date === 1) return [...orders, { instrument: instrument, size: 1 }];
		// Turn around (from long to short)
		if (date === 2) return [...orders, { instrument: instrument, size: -2 }];
		// Add positions on same side
		if (date === 3) return [...orders, { instrument: instrument, size: -1 }];
		// Order only on one instrument (no aapl data on 5th)
		if (date === 4) return [...orders, { instrument: instrument, size: 2 }];
		return [];
	}
	const { instruments } = setupData(rawData);
	const config = new Map([['cash', () => 1000]]);
	const bt = new BacktestInstance(instruments, orderGenerator, config);
	await bt.run();
	// One entry is made for every trade – when buying aapl & amzn on jan 2, one entry is made
	// for each of those trades.
	const acc = bt.accounts.data;
	t.is(acc.length, 10);
	// Open on 1st
	t.deepEqual(acc[0], {
		key: new Date(2018, 0, 1),
		data: new Map([
			['cash', 1000],
			['positions', 0],
			['total', 1000],
		])
	});
	// Close on 1st
	t.deepEqual(acc[1], {
		key: new Date(2018, 0, 1),
		data: new Map([
			['cash', 1000],
			['positions', 0],
			['total', 1000],
		])
	});
	// Open on 2nd: bought 1 aapl @ 12, 1 amzn @ 3
	t.deepEqual(acc[2], {
		key: new Date(2018, 0, 2),
		data: new Map([
			['cash', 985],
			// Instruments are sorted alphabetically
			[instruments.instruments[0], 12],
			[instruments.instruments[1], 3],
			['positions', 15],
			['total', 1000],
		])
	});
	// Close on 2nd
	t.deepEqual(acc[3], {
		key: new Date(2018, 0, 2),
		data: new Map([
			['cash', 985],
			[instruments.instruments[0], 13],
			[instruments.instruments[1], 4],
			['positions', 17],
			['total', 1002],
		])
	});
	// Open on 3rd
	// Sold 1 aapl @ 11 (original: 12), bought 1 aapl short @ 11
	// Sold 1 amzn @ 2 (original: 3), bought 1 amzn short @ 2
	t.deepEqual(acc[4], {
		key: new Date(2018, 0, 3),
		data: new Map([
			['cash', 985],
			[instruments.instruments[0], 11],
			[instruments.instruments[1], 2],
			// Lost 2 (from original price) on each when selling
			['positions', 13],
			['total', 998],
		])
	});
	// Close on 3rd (we're short – higher closing prices mean less money)
	// aapl @15, amzn @ 3
	t.deepEqual(acc[5], {
		key: new Date(2018, 0, 3),
		data: new Map([
			['cash', 985],
			[instruments.instruments[0], 7], // 11 - 4 (difference from 15 to 11)
			[instruments.instruments[1], 1], // 2 - 1 (difference from open)
			// Lost 2 (from original price) on each when selling
			['positions', 8],
			['total', 993],
		])
	});
	// Open on 4rd, add -1 aapl @9, -1 amzn @3
	t.deepEqual(acc[6], {
		key: new Date(2018, 0, 4),
		data: new Map([
			['cash', 973],
			[instruments.instruments[0], 22], // 13 (prev) + 9 (new)
			[instruments.instruments[1], 4], // 1 (prev) + 3 (new)
			// Lost 2 (from original price) on each when selling
			['positions', 26],
			['total', 999],
		])
	});
	// Close on 4rd, aapl @12, amzn @4
	t.deepEqual(acc[7], {
		key: new Date(2018, 0, 4),
		data: new Map([
			['cash', 973],
			[instruments.instruments[0], 16], 
			[instruments.instruments[1], 2], 
			// Lost 2 (from original price) on each when selling
			['positions', 18],
			['total', 991],
		])
	});
	// Open on 5th, cover 2 amzn @2
	t.deepEqual(acc[8], {
		key: new Date(2018, 0, 4),
		data: new Map([
			['cash', 977],
			[instruments.instruments[0], 16], // unchanged, no data
			[instruments.instruments[1], 0], // covered, no position
			['positions', 16],
			['total', 993],
		])
	});

});



test.skip('empty dates work as well!', (t) => {
	t.pass();
});



test.skip('ignores orders with missing cash', async (t) => {
	const rawData = [
		['aapl', 1, 10, 11],
		['aapl', 2, 12, 13],
	];
	function orderGenerator(orders, instrument) {
		return [{ instrument: instrument, size: 200}];
	}
	const { instruments } = setupData(rawData);
	const config = new Map([['cash', () => 1000]]);
	const bt = new BacktestInstance(instruments, orderGenerator, config);
	await bt.run();
	// No entry is added to this.positions when we don't have the cash to do so.
	t.is(bt.positions.data.length, 1);
	t.is(bt.accounts.data.length, 1);
});



test.skip('orders are valid only until the end of bar', async (t) => {
	const rawData = [
		['aapl', 1, 10, 11],
		['aapl', 2, 12, 13],
		['aapl', 3, 0.5, 0.6],
	];
	function orderGenerator(orders, instrument) {
		if (instrument.head().get('date').getDate() !== 1) return [];
		return [{ instrument: instrument, size: 200}];
	}
	const { instruments } = setupData(rawData);
	const config = new Map([['cash', () => 1000]]);
	const bt = new BacktestInstance(instruments, orderGenerator, config);
	await bt.run();
	const pos = bt.positions.data;
	// Order is created on jan 1, should be executed on jan 2; could be executed on jan 3 (as price 
	// is low) but is not executed because order is not valid any more.
	// On jan 2, no entry is added to this.positions (because no positions are taken), same for 
	// jan 3 (no orders available)
	t.is(pos.length, 1);
	t.deepEqual(pos[0].key, new Date(2018, 0, 1));
});*/

