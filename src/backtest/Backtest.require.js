import test from 'ava';
import Backtest from './Backtest';
import debug from 'debug';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
const log = debug('WalkForward:Backtest.require');

function setupData() {

	class DataSource {
		data = [ new Map([
				['date', new Date(2018, 0, 3)], 
				['instrument', 'aapl'], 
				['open', 3],
				['close', 4], 
				['high', 4],
				['low', 3],
			]), new Map([
				['date', new Date(2018, 0, 1)], 
				['instrument', 'aapl'], 
				['open', 3],
				['close', 2], 
				['high', 3],
				['low', 1],
			]), new Map([
				['date', new Date(2018, 0, 1)], 
				['instrument', '0700'], 
				['open', 2],
				['close', 3], 
				['high', 4],
				['low', 2]
			]),
		];
		index = 0;
		async read() {
			return new Promise((resolve) => {
				const result = this.data[this.index] || false;
				log('Return result %o', result);
				resolve(result);
				this.index++;
			});
		}
	}
	const dataSource = new DataSource();
	return { dataSource };
}


test('accepts and stores strategies', (t) => {
	const bt = new Backtest();
	// Wrong argument
	t.throws(() => bt.setStrategies('notafunction'), /function/);
});

test('cannot be run without strategies or instruments', (t) => {
	const bt = new Backtest();
	// Run without strategy
	t.throws(() => bt.run(), /more strategies/);
	// Run without instruments: Throws
	bt.setStrategies(() => {});
	t.throws(() => bt.run(), /accessing instruments/);
});

test('runs strategies after they were added with corret arguments', async (t) => {
	const bt = new Backtest();
	const { dataSource } = setupData();
	const args = [];
	bt.setDataSource(dataSource);
	bt.setStrategies((params, instruments) => {
		args.push([params, instruments]);
	});
	t.is(args.length, 0);
	await bt.run();
	t.is(args.length, 1);
	t.deepEqual(args[0][0], {});
	t.is(args[0][1] instanceof BacktestInstruments, true);
});


test('handles bad and good data sources', (t) => {
	const { dataSource } = setupData();
	const bt = new Backtest();
	t.throws(() => bt.setDataSource(), /method/);
	t.throws(() => bt.setDataSource({ read: false }), /method/);
	t.notThrows(() => bt.setDataSource(dataSource));
	// Sources cannot be changed
	t.throws(() => bt.setDataSource(dataSource), /cannot change/);
	// Source is set
	t.is(bt.dataSource, dataSource);
});

test('fails if accessing getInstruments too early', (t) => {
	const bt = new Backtest();
	t.throws(() => bt.getInstruments(), /setDataSource\(source\)/);
});

test.skip('getInstruments returns an emitter, calls handlers and awaits execution', async (t) => {
	const { dataSource } = setupData();
	const bt = new Backtest();
	bt.setDataSource(dataSource);
	const instruments = bt.getInstruments();
	const addedInstruments = [];
	const addedData = [];
	instruments.on('newInstrument', (...data) => {
		log('Instrument %o', data);
		addedInstruments.push(data);
	});
	instruments.on('data', (...data) => {
		log('Data %o', data);
		addedData.push(data);
	});
	await instruments.run();
	/*t.is(addedInstruments.length, 2);
	t.is(addedData.length, 3);
	t.is(addedData[0], {});*/
	t.pass();
});

test.skip('awaits execution of handlers', (t) => {	
	t.pass();
});

test.skip('getInstruments never returns the same emitter', (t) => {	
	t.pass();
});


