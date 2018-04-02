import test from 'ava';
import createTestData from './createTestData';
import BacktestInstanceRunner from './BacktestInstanceRunner';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import TransformableDataSeries from '../data-series/TransformableDataSeries';
import Instrument from '../instrument/Instrument';

const baseData = [{
	instrument: 'aapl',
	data: [
		[1, 10, 11],
	]
}];

function setupData(rawInstrumentData = baseData) {
	const data = createTestData(rawInstrumentData);
	let currentIndex = 0;
	function* dataGenerator() {
		while (currentIndex < data.length) {
			yield data[currentIndex++];
		}
	}

	const instruments = new BacktestInstruments(dataGenerator, true);
	const accounts = new TransformableDataSeries();
	accounts.add(new Date(2018, 0, 1), { cash: 100 });

	return { dataGenerator, instruments, accounts };
}

test('fails if orders is not an array', async (t) => {
	function orderGenerator() {
		return 'invalid';
	}
	const { instruments, accounts } = setupData();
	const bt1 = new BacktestInstanceRunner(instruments, orderGenerator, accounts);
	const err = await t.throws(bt1.run());
	t.is(err.message.indexOf('returned invalid orders') > -1, true);
});

test('fails if order data is not valid', async (t) => {
	const { instruments, accounts } = setupData();
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
	const bt1 = new BacktestInstanceRunner(instruments, orderGenerator1, accounts);
	const err1 = await t.throws(bt1.run());
	const bt2 = new BacktestInstanceRunner(instruments, orderGenerator2, accounts);
	const err2 = await t.throws(bt2.run());
	const bt3 = new BacktestInstanceRunner(instruments, orderGenerator3, accounts);
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
	const { instruments, accounts } = setupData();
	const bt = new BacktestInstanceRunner(instruments, orderGenerator, accounts);
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
	// Fourth param: accounts
	t.is(orderGeneratorParams[3].tail().get('cash'), 100);
});


test.skip('orders and sells', async (t) => {
	const rawData = [{
		instrument: 'aapl',
		data: [
			[1, 10, 11],
			[2, 12, 13],
			[3, 11, 5],
		]
	}];
	const data = createTestData(rawData);
	function orderGenerator(orders, instrument) {
		const date = instrument.head().date.getDate();
		if (date === 1) return [...orders, { instrument: instrument, size: 1 }];
		if (date === 2) return [...orders, { instrument: instrument, size: -1 }];
		return [];
	}
	const { instruments, accounts } = setupData(rawData);
	const bt = new BacktestInstanceRunner(instruments, orderGenerator, accounts);
	await bt.run();
	t.is(accounts.data.length, 3);
	t.is(accounts.tail().cash, 100);
	t.is(accounts.tail(2)[1].cash, 88);
	t.is(accounts.tail(3)[2].cash, 99);
});



test.skip('does not order if money is tight', async (t) => {
	const rawData = [{
		instrument: 'aapl',
		data: [
			[1, 10, 11],
			[2, 12, 13],
			[3, 11, 5],
		]
	}];
	const data = createTestData(rawData);
	function orderGenerator(orders, instrument) {
		const date = instrument.head().date.getDate();
		if (date === 1) return [...orders, { instrument: instrument, size: 1 }];
		if (date === 2) return [...orders, { instrument: instrument, size: 10 }];
		return [];
	}
	const { instruments, accounts } = setupData(rawData);
	const bt = new BacktestInstanceRunner(instruments, orderGenerator, accounts);
	await bt.run();
	t.is(accounts.data.length, 2);
	t.is(accounts.tail().cash, 100);
	t.is(accounts.tail(2)[1].cash, 88);
	// No third order was made
});




test.skip('handles short positions', async (t) => {
	const rawData = [{
		instrument: 'aapl',
		data: [
			[1, 10, 11],
			[2, 12, 13],
			[3, 11, 5],
		]
	}];
	const data = createTestData(rawData);
	function orderGenerator(orders, instrument) {
		const date = instrument.head().date.getDate();
		if (date === 1) return [...orders, { instrument: instrument, size: -2 }];
		if (date === 2) return [...orders, { instrument: instrument, size: 2 }];
		return [];
	}
	const { instruments, accounts } = setupData(rawData);
	const bt = new BacktestInstanceRunner(instruments, orderGenerator, accounts);
	await bt.run();
	t.is(accounts.data.length, 3);
	t.is(accounts.tail().cash, 100);
	t.is(accounts.tail(2)[1].cash, 76);
	t.is(accounts.tail(3)[2].cash, 98);
	t.is(instruments.instruments[0].tail(2)[1], '');
});



test.skip('handles two instruments', async (t) => {
	const rawData = [{
		instrument: 'aapl',
		data: [
			[1, 10, 11],
			[2, 12, 13],
			[3, 11, 5],
		]
	}, {
		instrument: 'amzn',
		data: [
			[1, 20, 21],
			[2, 22, 23],
			[4, 21, 15],
		]
	}];
	const data = createTestData(rawData);
	function orderGenerator(orders, instrument) {
		const date = instrument.head().date.getDate();
		if (date === 1) return [...orders, { instrument: instrument, size: 2 }];
		if (date === 2) return [...orders, { instrument: instrument, size: -2 }];
		return [];
	}
	const { instruments, accounts } = setupData(rawData);
	const bt = new BacktestInstanceRunner(instruments, orderGenerator, accounts);
	await bt.run();
	t.is(accounts.data.length, 2);
	t.is(accounts.tail().cash, 100);
	t.is(accounts.tail(2)[1].cash, 88);
	// No third order was made
});

