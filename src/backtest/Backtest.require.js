import test from 'ava';
import Backtest from './Backtest';
import BacktestInstance from '../backtest-instance/BacktestInstance';
import logger from '../logger/logger';
import createTestData from '../helpers/createTestData';
//import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
const { debug } = logger('WalkForward:Backtest.require');

function setupData(passedData) {

	// Order is important!
	const rawData = passedData || [
		['aapl', 1, 3, 2],
		['0700', 1, 2, 3],
		['aapl', 3, 3, 4],
	];
	const data = createTestData(rawData);

	class DataSource {
		constructor() {
			this.data = data;
		}
		index = 0;
		async read() {
			if (this.index >= this.data.length) return new Promise((resolve) => resolve(false));
			return new Promise((resolve) => {
				debug('Read from dataSource, index is %d', this.index);
				if (!this.data[this.index]) resolve(false);
				const result = this.data[this.index];
				debug('Return result %o', result);
				resolve([result]);
				this.index++;
			});
		}
	}
	const dataSource = new DataSource();

	const strategy = () => ({ 
		onClose: () => []
	});

	return { dataSource, strategy };
}





// STRATEGIES

test('accepts and stores strategies', (t) => {
	const bt = new Backtest();
	// Wrong argument
	t.throws(() => bt.setStrategies('notafunction'), /function/);
});

/*test('throws if onClose method is missing', async (t) => {
	const bt = new Backtest();
	const { dataSource } = setupData();
	bt.setDataSource(dataSource);
	bt.setStrategies(() => {
		return {
			onClose: 'notAFunction',
		};
	});
	const err = await t.throws(bt.run());
	t.is(err.message.includes('no onClosed'), true);
});*/


test('strategies are called with paramSets if optimizations are set', async (t) => {
	const bt = new Backtest();
	const { dataSource } = setupData();
	const args = [];
	bt.setDataSource(dataSource);
	bt.addOptimization('name', [1, 4], 3);
	bt.setStrategies((...params) => {
		args.push(params);
		return {
			onClose: () => [],
		};
	});
	t.is(args.length, 0);
	await bt.run();
	t.is(args.length, 3);
});

test('strategies are called with undefined if optimizations are missing', async (t) => {
	const bt = new Backtest();
	const { dataSource } = setupData();
	const args = [];
	bt.setDataSource(dataSource);
	bt.setStrategies((...params) => {
		args.push(params);
		return {
			onClose: () => []
		};
	});
	t.is(args.length, 0);
	await bt.run();
	t.is(args.length, 1);
	t.deepEqual(args[0][0], undefined);
});




// OPTIMIZATIONS
test('adds optimizations', (t) => {
	const bt = new Backtest();
	bt.addOptimization('name', [1, 4], 3);
	// Just one param set with 3 param values
	t.is(bt.optimization.generateParameterSets().length, 3);
});







// DATA SOURCES and INSTRUMENTS

test('validates and stores data sources', (t) => {
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


/*test('fails if accessing createInstruments too early', (t) => {
	const bt = new Backtest();
	t.throws(() => bt.createInstruments(), /setDataSource\(source\)/);
});*/

/*test('createInstruments returns emitter, calls handlers and awaits execution', async (t) => {
	const { dataSource } = setupData();
	const bt = new Backtest();
	bt.setDataSource(dataSource);
	const instruments = bt.createInstruments();
	const addedInstruments = [];
	const addedData = [];
	instruments.on('newInstrument', (...data) => {
		debug('Instrument %o', data);
		addedInstruments.push(data);
	});
	instruments.on('open', (...data) => {
		debug('Data %o', data);
		addedData.push(data);
	});
	await instruments.run();
	t.is(addedInstruments.length, 2);
	t.is(addedData.length, 3);
});*/






// CONFIGURATION

 test('fails if invalid configurations are provided', (t) => {
	const bt = new Backtest();
	// Not a map
	t.throws(() => bt.setConfiguration('notAMap'), /must be a Map/);
	// Not a function
	t.throws(() => bt.setConfiguration(new Map([
		['cash', 1000],
	])), /function, is number/);
	// Valid
	t.notThrows(() => bt.setConfiguration(new Map([
		['cash', () => 1000],
	])));
	// Valid (with invalid keys)
	t.notThrows(() => bt.setConfiguration(new Map([
		['cash', () => 1000],
		['invalidKey', 'invalidProperty']
	])));
});

test('stores a valid config', (t) => {
	// Valid (with invalid keys)
	const bt = new Backtest();
	bt.setConfiguration(new Map([
		['cash', () => 1000],
		['invalidKey', 'invalidProperty']
	]));
	// Only cash is stored
	t.is(bt.configuration.size, 1);
	t.is(bt.configuration.has('cash'), true);
	t.is(typeof bt.configuration.get('cash'), 'function');
	t.is(bt.configuration.get('cash')(), 1000);
});

test('config: handles empty values correctly', (t) => {
	const bt = new Backtest();
	bt.setConfiguration(new Map([]));
	t.is(bt.configuration.get('cash')(), 100000);
});

test('config: cash defaults to 100k', (t) => {
	const bt = new Backtest();
	bt.setConfiguration(new Map([]));
	t.is(bt.configuration.get('cash')(), 100000);
});




// RUN

test('cannot be run without strategies or instruments', async (t) => {
	const bt = new Backtest();
	// Run without strategy
	t.throwsAsync(() => bt.run(), /Use the setStrategies/);
	bt.setStrategies(() => { 
		return {
			onClose: () => { return []; }
		};
	});
	// Run without instruments: Throws
	await t.throwsAsync(() => bt.run(), /Use setDataSource/);

	const { dataSource } = setupData();
	bt.setDataSource(dataSource);
	await t.notThrowsAsync(() => bt.run());
});


test('runs a backtest with parameter sets', async (t) => {
	const bt = new Backtest();
	const { dataSource, strategy } = setupData();
	bt.setStrategies(strategy);
	bt.setDataSource(dataSource);
	bt.addOptimization('slowSMA', [1, 3], 3);
	bt.addOptimization('fastSMA', [2, 4], 3);
	await bt.run();
	t.is(bt.instances.size, 9);
	for (const [, instance] of bt.instances) {
		t.is(instance instanceof BacktestInstance, true);
	}

});



test('cannot save before running', async (t) => {
	const bt = new Backtest();
	await t.throwsAsync(() => bt.save(), /cannot save backtest/);
});




test('run returns the instances', async (t) => {
	const bt = new Backtest();
	const { dataSource, strategy } = setupData();
	bt.setStrategies(strategy);
	bt.setDataSource(dataSource);
	const results = await bt.run();
	t.is(results instanceof Map, true);
});






// PERFORMANCE INDICATORS

test('adds performanceIndicators', (t) => {
	const bt = new Backtest();
	t.throws(() => bt.addPerformanceIndicators({}), /calculate property/);
	t.throws(() => bt.addPerformanceIndicators({ calculate: null }), /calculate property/);
	t.throws(() => bt.addPerformanceIndicators({ calculate: () => {} }), /indicator's name/);
	t.notThrows(() => bt.addPerformanceIndicators({ calculate: () => {}, getName: () => '' }));
});

test('executes performanceIndicators', async (t) => {
	const bt = new Backtest();
	const { dataSource, strategy } = setupData();
	bt.setStrategies(strategy);
	bt.setDataSource(dataSource);
	class PI {
		getName() { return 'testPI'; }
		calculate() { return new Promise((resolve) => resolve(3.5)); }
	}
	bt.addPerformanceIndicators(new PI());
	const results = await bt.run();
	results.forEach((result) => {
		console.debug('result', result);
		t.is(result.performanceResults.get('testPI'), 3.5);
	});
});





/*test('runs a real backtest', async (t) => {
	const bt = new Backtest();
	const { dataSource } = setupData([
		['aapl', 2, 3, 5],
		['0700', 2, 2, 4],
		['aapl', 3, 4, 6],
		['0700', 3, 3, 6],
		['aapl', 4, 4, 6],
		['0700', 4, 3, 4],
		['aapl', 5, 4, 7],
		['0700', 5, 4, 5],
	]);
	bt.setDataSource(dataSource);
	// It's important to test multiple parameters here as this creates new problems (e.g.
	// multiple BacktestInstruments that use the same DataGenerator)
	bt.addOptimization('name', [1, 2], 2);
	bt.setStrategies((params) => {
		return {
			onClose: function(orders, instrument) { 
				// Buy y of instrument if date % x is 0 (x is 1 or 2 depending on param)
				// y is date or date * -1 every 2nd time
				const date = instrument.head().get('date').getDate();
				const param = Math.round(params.get('name'));
				if (date % param === 0) {
					const size = date % (param * 2) === 0 ? date : date * -1;
					const order = [...orders, { instrument: instrument, size }];
					return order;
				}
				return []; 
			}
		};
	});
	const instances = await bt.run();
	t.is(instances.length, 2);
	t.is(instances[0].parameterSet.get('name').toFixed(2), (1).toFixed(2));
	t.is(instances[0].accounts.head().get('cash'), 99977);
	t.is(instances[1].accounts.head().get('cash'), 99986);
});
*/




