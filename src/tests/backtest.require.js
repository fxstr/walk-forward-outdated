// Must be required; if it is not, babel won't compile async generators
// Global integration test. All library specific tests are where the libraries are. 

import path from 'path';
import del from 'del';
import fs from 'fs';
import test from 'ava';
import Backtest, { rejectOnFalse, runThrough, BacktestCSVSource, Algorithm } from '../index.js';
import { ProfitFactor, Cagr } from '../performanceIndicators';
import { Sma as SMA, Stoch } from '../indicators.js';
import logger from '../logger/logger';
const { debug, info } = logger('WalkForward:BacktestTest');

function clearDirectory() {
	const output = path.join(__dirname, 'test-data', 'output');
    del.sync(output);
    fs.mkdirSync(output);
}



class SMAAlgo extends Algorithm {

	fastSMAKey = 'fastSma'; // Better: Use Symbol(); issue: name doesn't look nice when they're
							// exported/saved
	slowSMAKey = 'slowSma';

	constructor(field, fastSMA, slowSMA) {
		super();
		debug('SMAAlgo: Init with %s %d %d, is %o', field, fastSMA, slowSMA, this);
		this.field = field;
		// Params are floats – convert them to ints
		this.fastSMALength = Math.round(fastSMA, 10);
		this.slowSMALength = Math.round(slowSMA, 10);
	}

	onNewInstrument(instrument) {
		debug('SMAAlgo: Instrument %o added; fast is %d, slow %d', instrument.name, 
			this.fastSMALength, this.slowSMALength);
		instrument.addTransformer([this.field], new SMA(this.fastSMALength),
			this.fastSMAKey);
		instrument.addTransformer([this.field], new SMA(this.slowSMALength),
			this.slowSMAKey);
	}

	onClose(orders, instrument) {
		debug('onClose, orders are %o, instrument is %o', orders, instrument);
		const fast = instrument.head().get(this.fastSMAKey);
		const slow = instrument.head().get(this.slowSMAKey);
		debug('%o %o: %o > %o?', instrument.head().get('date'), instrument.name, fast, slow);
		if (slow !== undefined && fast !== undefined) {
			if (fast > slow) {
				debug('SMA: Create order for %o', instrument.name);
				return [...orders, { size: 1, instrument: instrument }];
			}
			else if (fast < slow) {
				return [...orders, { size: -1, instrument: instrument }];
			}
		}
		return [];
	}

}


// Stoch indicators to
// a) test export of multi-return-value indicator
// c) test runThrough
class StochIndicators extends Algorithm {

	stochKKey = 'stoch_K'; // Should use Symbol()
	stochDKey = 'stoch_D';

	/**
	 * Params: k, k slowing factor and d slowing factor
	 */
	constructor(...args) {
		super();
		this.periods = args;
	}

	onNewInstrument(instrument) {
		instrument.addTransformer(
			['high', 'low', 'close'], 
			new Stoch(this.periods[0], this.periods[1], this.periods[2]),
			{ stoch_k: this.stochKKey, stoch_d: this.stochDKey },
		);

	}

}



/**
 * Allocates every instrument the same amount of money; if a strategy has 5 instruments and a
 * cash pile of 100k, every instrument gets 20k. 
 */
class EqualPositionSize extends Algorithm {
	
	async onClose(orders, instrument) {

		// Make it async – just to test
		await new Promise((resolve) => setTimeout(resolve), 20);

		debug(
			'EqualPositionSize: Original orders on %o are %o',
			instrument.head().get('date'),
			orders.map(order => order.instrument.name).join(', ')
		);

		const instrumentsWithPositions = [...this.getCurrentPositions().keys()];
		debug(
			'EqualPositionSize: Current instruments with positions are %o',
			instrumentsWithPositions.map(instrument => instrument.name).join(', ')
		);

		// Don't allow double-orders for long positions: Remove all instruments from orders that
		// have positions
		const ordersWithoutPositions = orders.filter(order => (
			order.size < 0 || !instrumentsWithPositions.includes(order.instrument)
		));

		debug(
			'EqualPositionSize: Orders without positions are %o',
			ordersWithoutPositions.map(order => order.instrument.name).join(', ')
		);

		// Remove orders trying to close positions that don't exist
		const ordersWithoutInvalidCloses = ordersWithoutPositions.filter(order => {
			debug(this.getCurrentPositions().get(order.instrument));
			const position = this.getCurrentPositions().get(order.instrument);
			return order.size > 0 || (position && position.size);
		});

		debug(
			'EqualPositionSize: Valid orders are %o',
			ordersWithoutInvalidCloses.map(order => order.instrument.name).join(', ')
		);

		// Distribute cash evenly among instruments without positions
		const instrumentsWithoutPositionCount = this.getInstruments().length - 
			this.getCurrentPositions().size;

		const currentCash = this.getAccounts().head().get('cash');
		const moneyPerInstrument = currentCash / this.getInstruments().length;

		const newOrders = ordersWithoutInvalidCloses.map(order => {
			
			// Order size -1: Close the whole current position *if* there is a current position
			// TODO: FUCK! That won't work because on the 2nd iteration, size isn't -1 any more,
			// but previousSize * -1!!!
			if (order.size === -1) {
				info('Order size -1 for %s', order.instrument.name);
				return{
					instrument: order.instrument,
					size: this.getCurrentPositions().get(order.instrument).size * -1,
				};
			} else if (order.size < 0) {
				return order;
			} else {
				return {
					// 0.9: Security margin if prices go up before the next open
					size: Math.floor(moneyPerInstrument / order.instrument.head().get('close') * 
						0.9),
					instrument: order.instrument,					
				};
			}
		});

		debug(
			'EqualPositionSize: %d instruments, %d positions, without positions %d; cash %d, moneyPerInstrument %d, orders were %o and are %o',
			this.getInstruments().length,
			this.getCurrentPositions().size, 
			instrumentsWithoutPositionCount,
			currentCash,
			moneyPerInstrument,
			orders.map(order => `${order.instrument.name}/${order.size}`).join(', '),
			newOrders.map(order => `${order.instrument.name}/${order.size}`).join(', '),
		);

		return newOrders;

	}
}




async function runTest() {

	// Has stream, accounts, optimizations
	const backtest = new Backtest();
	
	const dataSource = new BacktestCSVSource(
		(csvName) => {
			const instrumentName = csvName.substring(csvName.lastIndexOf('/') + 1, csvName.length - 4);
			debug('runTest, Instrument name is %o from csv %o', instrumentName, csvName);
			return instrumentName;
		},
		[path.join(__dirname, 'test-data/input/*.csv')],
	);
	backtest.setDataSource(dataSource);
	backtest.addPerformanceIndicators(new ProfitFactor());
	backtest.addPerformanceIndicators(new Cagr());

	//backtest.addOptimization('slowSMA', [1, 3], 3);
	//backtest.addOptimization('fastSMA', [2, 4], 3);

	const config = new Map([['cash', () => 10000]]);
	backtest.setConfiguration(config);

	backtest.setStrategies((params) => {
		return runThrough(
			new StochIndicators(3, 1, 2),
			rejectOnFalse(
				//new SMAAlgo('close', params.get('fastSMA'), params.get('slowSMA')),
				new SMAAlgo('close', 1, 2),
				new EqualPositionSize(),
			),
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



