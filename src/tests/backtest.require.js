// Must be required; if it is not, babel won't compile async generators
// Global integration test. All library specific tests are where the libraries are. 

import path from 'path';
import test from 'ava';
import Backtest, { rejectOnFalse, BacktestCSVSource, indicators } from '../index.js';



class SMAAlgo {

	constructor(field, fastSMA, slowSMA) {
		console.log('SMAAlgo: Init with %s %d %d, is %o', field, fastSMA, slowSMA, this);
		this.field = field;
		this.fastSMALength = fastSMA;
		this.slowSMALength = slowSMA;
	}

	onNewInstrument(instrument) {
		console.log('SMAAlgo: Instrument %o added; fast is %d, slow %d', instrument, 
			this.fastSMALength, this.slowSMALength);
		this.fastSMAKey = instrument.addTransformer([this.field], 
			new indicators.SMA(this.fastSMALength));
		this.slowSMAKey = instrument.addTransformer([this.field], 
			new indicators.SMA(this.slowSMALength));
		console.log('SMAAlgo: Keys are fastSMAKey %o and slowSMAKey %o', this.fastSMAKey, 
			this.slowSMAKey);
	}

	onClose(orders, instrument) {
		const fast = instrument.head().get(this.fastSMAKeyy);
		const slow = instrument.head().get(this.slowSMAKeyy);
		console.log('SMAAlgo: close, head is %o, fastSMA %d, slowSMA %d, key is %o', 
			instrument.head(), fast, slow, this.fastSMAKey);
		if (fast && slow && fast > slow) {
			console.log('SMAAlgo: close, create order for instrument %s', instrument.name);
			return [...orders, { size: 1, instrument: instrument }];
		}
		return [];
	}

}


class EqualPositionSize {
	onClose(orders, instrument, instruments, backtest) {
		const newOrders = [];
		console.log('EqualPositionSize: close, orders are %o', orders);
		orders.map((order) => {
			const cash = backtest.accounts.head().get('cash');
			const close = order.instrument.head().get('close');
			console.log('EqualPositionSize: Cash is %d, orders %d, close %d', cash, orders.length,
				close);
			const newSize = Math.floor(cash / orders.length / close);
			const updatedOrder = {
				size: newSize, 
				instrument: order.instrument,
			};
			console.log('EqualPositionSize: New order is %o', updatedOrder);
			return updatedOrder;
		});
		return newOrders;
	}
}




async function runTest() {

	// Has stream, accounts, optimizations
	const backtest = new Backtest();
	
	const dataSource = new BacktestCSVSource(
		(name) => {
			const instrumentName = name.substring(name.lastIndexOf('/') + 1, name.length - 4);
			console.log('runTest, Instrument name is %o from %o', instrumentName, name);
			return instrumentName;
		},
		[path.join(__dirname, 'test-data/input/*.csv')],
	);
	backtest.setDataSource(dataSource);

	backtest.addOptimization('slowSMA', [1, 3], 3);
	backtest.addOptimization('fastSMA', [2, 4], 3);

	const config = new Map();
	config.cash = () => 10000;
	backtest.setConfiguration(config);

	backtest.setStrategies((params) => {
		return rejectOnFalse(
			new SMAAlgo('close', params.get('fastSMA'), params.get('slowSMA')),
			new EqualPositionSize(),
		);
	});

	const result = await backtest.run(new Date(2018, 0, 1));
	console.log('R E S U L T is', result);

	return backtest;

	// Writes JSON for all instruments (setStream) and result1/2 (setResults) to file system
	// True for zip/folder (?)
//	await backtest.save('./data', true);

}



test('outputs correct results', async (t) => {
	const backtest = await runTest();
	console.log('B A C K T E S T', backtest);
	t.pass();
});



