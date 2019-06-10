import test from 'ava';
import Backtest from './Backtest';
import BacktestInstance from '../backtest-instance/BacktestInstance';
import logger from '../logger/logger';
import createTestData from '../helpers/createTestData';
// import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
const { debug } = logger('WalkForward:Backtest.require');

function setupData(passedData) {

    // Order is important!
    const rawData = passedData || [
        ['aapl', 1, 3, 2],
        ['0700', 1, 2, 3],
        ['aapl', 3, 3, 4],
    ];

    class DataSource {
        async* generate() {
            const data = createTestData(rawData);
            for (const dataSet of data) {
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                yield dataSet;
            }
        }
    }
    const dataSource = new DataSource();

    const strategy = () => [{ handleClose: () => new Map() }];

    return { dataSource, strategy };
}





// STRATEGIES

test('accepts and stores strategies', (t) => {
    const bt = new Backtest();
    // Wrong argument
    t.throws(() => bt.setStrategy('notafunction'), /function/);
});

test('fails if strategy does not return an array', async(t) => {
    const bt = new Backtest();
    const { dataSource } = setupData();
    bt.setDataSource(dataSource);
    bt.setStrategy(() => 'notanarray');
    // throwsAsync does not work here, IDK why
    try {
        await bt.run();
        t.fail();
    }
    catch (err) {
        t.is(err.message.includes('Strategy function must return an array'), true);
    }
});

test('strategies are called with paramSets if optimizations are set', async(t) => {
    const bt = new Backtest();
    const { dataSource } = setupData();
    const args = [];
    bt.setDataSource(dataSource);
    bt.addOptimization('name', [1, 4], 3);
    bt.setStrategy((...params) => {
        args.push(params);
        return [{ handleClose: () => new Map() }];
    });
    t.is(args.length, 0);
    await bt.run();
    t.is(args.length, 3);
});

test('strategies are called with undefined if optimizations are missing', async(t) => {
    const bt = new Backtest();
    const { dataSource } = setupData();
    const args = [];
    bt.setDataSource(dataSource);
    bt.setStrategy((...params) => {
        args.push(params);
        return [{ handleClose: () => new Map() }];
    });
    t.is(args.length, 0);
    await bt.run();
    t.is(args.length, 1);
    t.deepEqual(args[0][0], undefined);
});











// DATA SOURCES and INSTRUMENTS

test('validates and stores data sources', (t) => {
    const { dataSource } = setupData();
    const bt = new Backtest();
    t.throws(() => bt.setDataSource(), /method/);
    t.throws(() => bt.setDataSource({ generate: false }), /method/);
    t.notThrows(() => bt.setDataSource(dataSource));
    // Sources cannot be changed
    t.throws(() => bt.setDataSource(dataSource), /cannot change/);
    // Source is set
    t.is(bt.dataSource, dataSource);
});







// CONFIGURATION

test('fails if invalid configurations are provided', (t) => {
    const bt = new Backtest();
    // Not a map
    t.throws(() => bt.setConfiguration('notAMap'));
    // Valid
    t.notThrows(() => bt.setConfiguration(new Map([
        ['cash', 1000],
    ])));
});

test('stores a valid config', (t) => {
    // Valid (with invalid keys)
    const bt = new Backtest();
    bt.setConfiguration(new Map([
        ['cash', 100],
        ['startDate', new Date(2018, 0, 1)],
        ['invalidKey', 'invalidProperty'],
    ]));
    // Only cash is stored
    t.deepEqual(bt.configuration, new Map([
        ['cash', 100],
        ['startDate', new Date(2018, 0, 1)],
    ]));
});

test('config: sets default valuues correctly', async(t) => {
    const bt = new Backtest();
    const { dataSource, strategy } = setupData();
    bt.setStrategy(strategy);
    bt.setDataSource(dataSource);
    await bt.run();
    t.deepEqual(bt.configuration, new Map([
        ['cash', 1000],
    ]));
});






// RUN

test('cannot be run without strategies or instruments', async(t) => {
    const bt = new Backtest();
    // Run without strategy
    t.throwsAsync(() => bt.run(), /Use the setStrategy/);
    bt.setStrategy(() => [
        { handleClose: () => new Map() },
    ]);
    // Run without instruments: Throws
    await t.throwsAsync(() => bt.run(), /Use setDataSource/);
    const { dataSource } = setupData();
    bt.setDataSource(dataSource);
    await t.notThrowsAsync(() => bt.run());
});


test('runs a backtest with parameter sets', async(t) => {
    const bt = new Backtest();
    const { dataSource, strategy } = setupData();
    bt.setStrategy(strategy);
    bt.setDataSource(dataSource);
    bt.addOptimization('slowSMA', [1, 3], 3);
    bt.addOptimization('fastSMA', [2, 4], 3);
    const instances = await bt.run();
    t.is(instances.size, 9);
});

test('run returns the instances', async(t) => {
    const bt = new Backtest();
    const { dataSource, strategy } = setupData();
    bt.setStrategy(strategy);
    bt.setDataSource(dataSource);
    const results = await bt.run();
    t.is(results instanceof Map, true);
    for (const [pramSet, instance] of results) {
        t.is(pramSet, undefined);
        t.is(instance instanceof BacktestInstance, true);
    }
});




// SAVE / EXPORT

test('cannot save before running', async(t) => {
    const bt = new Backtest();
    await t.throwsAsync(() => bt.save(), /cannot save backtest/);
});







// PERFORMANCE INDICATORS

test('handles invalid and adds valid performanceIndicators', (t) => {
    const bt = new Backtest();
    t.throws(() => bt.addPerformanceIndicators({}), /calculate method/);
    t.throws(() => bt.addPerformanceIndicators({ calculate: null }), /calculate method/);
    t.throws(() => bt.addPerformanceIndicators({ calculate: () => {} }), /indicator's name/);
    t.notThrows(() => bt.addPerformanceIndicators({ calculate: () => {}, getName: () => '' }));
});

test('executes performanceIndicators', async(t) => {
    const bt = new Backtest();
    const { dataSource, strategy } = setupData();
    bt.setStrategy(strategy);
    bt.setDataSource(dataSource);
    class PI {
        getName() {
            return 'testPI';
        }
        calculate() {
            return new Promise(resolve => resolve(3.5));
        }
    }
    bt.addPerformanceIndicators(new PI());
    const results = await bt.run();
    results.forEach((result) => {
        t.is(result.performanceResults.get('testPI'), 3.5);
    });
});


