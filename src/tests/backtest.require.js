// Must be required; if it is not, babel won't compile async generators
// Global integration test. All library specific tests are where the libraries are. 

import path from 'path';
import del from 'del';
import fs from 'fs';
import test from 'ava';
import Backtest, { rejectOnFalse, BacktestCSVSource, Algorithm } from '../index.js';
import { sma as SMA } from '../indicators.js';


function clearDirectory() {
	const output = path.join(__dirname, 'test-data', 'output');
    del.sync(output);
    fs.mkdirSync(output);
}



class SMAAlgo extends Algorithm {

	fastSMAKey = 'fastSma'; // Better: Use Symbols()
	slowSMAKey = 'slowSma';

	constructor(field, fastSMA, slowSMA) {
		super();
		console.log('SMAAlgo: Init with %s %d %d, is %o', field, fastSMA, slowSMA, this);
		this.field = field;
		this.fastSMALength = Math.round(fastSMA, 10);
		this.slowSMALength = Math.round(slowSMA, 10);
	}

	onNewInstrument(instrument) {
		console.log('SMAAlgo: Instrument %o added; fast is %d, slow %d', instrument.name, 
			this.fastSMALength, this.slowSMALength);
		instrument.addTransformer([this.field], new SMA(this.fastSMALength),
			this.fastSMAKey);
		instrument.addTransformer([this.field], new SMA(this.slowSMALength),
			this.slowSMAKey);
	}

	onClose(orders, instrument) {
		const fast = instrument.head().get(this.fastSMAKey);
		const slow = instrument.head().get(this.slowSMAKey);
		console.log('%f > %f?', fast, slow);
		if (fast && slow && fast > slow) {
			console.log('SMA: Create order for %o', instrument.name);
			return [...orders, { size: 1, instrument: instrument }];
		}
		else if (fast && slow && fast < slow) {
			return [...orders, { size: -1, instrument: instrument }];
		}
		return [];
	}

}


class EqualPositionSize extends Algorithm {
	
	async onClose(orders) {

		// Make it async – just to test
		await new Promise((resolve) => setTimeout(resolve), 2);

		const positions = this.getCurrentPositions();
		const newOrders = [];

		const closeOrders = orders.filter((order) => order.size === -1);
		closeOrders.forEach((order) => {
			console.log('Try to close; order size is -1 for %s, position size %o', 
				order.instrument.name, positions.get(order.instrument));
			const existing = positions.get(order.instrument);
			if (existing) {
				newOrders.push({
					instrument: order.instrument,
					size: existing.size * -1,
				});
				console.log('Close for %s/%d', order.instrument.name, existing.size * -1);
			}
		});

		const openOrders = orders.filter((order) => order.size === 1);
		const cash = this.getAccounts().head().get('cash');
		// Sum up the open value of all instruments that have orders
		const openOrderValue = openOrders.reduce((prev, order) => {
			return prev + order.instrument.head().get('close') || 0;
		}, 0);
		openOrders.forEach((order) => {
			const close = order.instrument.head().get('close');
			console.log('EqualPositionSize: Cash is %d, orders %d, close %d', cash, 
				orders.length, close);
			// Add 0.8 to make sure the order is executed even if prices go up on close
			const newSize = Math.floor(cash * (close / openOrderValue) / close * 0.8);
			console.log('EqualPositionSize: New pos size is %d; close %d and all closes %d', 
				newSize, close, openOrderValue);
			const updatedOrder = {
				size: newSize, 
				instrument: order.instrument,
			};
			console.log('EqualPositionSize: New order is %d/%s', updatedOrder.size, 
				updatedOrder.instrument.name);
			newOrders.push(updatedOrder);
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

	//backtest.addOptimization('slowSMA', [1, 3], 3);
	//backtest.addOptimization('fastSMA', [2, 4], 3);

	const config = new Map();
	config.cash = () => 10000;
	backtest.setConfiguration(config);

	backtest.setStrategies((params) => {
		return rejectOnFalse(
			//new SMAAlgo('close', params.get('fastSMA'), params.get('slowSMA')),
			new SMAAlgo('close', 1, 2),
			new EqualPositionSize(),
		);
	});

	await backtest.run();
	await backtest.save(path.join(__dirname, 'test-data/output'));

}



test('outputs correct results', async (t) => {
	clearDirectory();
	await runTest();
	t.pass();
});



