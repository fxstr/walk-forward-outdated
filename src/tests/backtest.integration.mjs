// Global integration test. All library specific tests are where the libraries are.

import path from 'path';
import del from 'del';
import fs from 'fs';
import test from 'ava';
import compareDir from 'dir-compare';
import Backtest, { CSVSource, Algorithm, performanceIndicators, indicators } from '../index.mjs';
import logger from '../logger/logger.mjs';
/* import {
    formatDate,
    formatOrders,
} from '../helpers/formatLogs'; */

// If we use .mjs, __dirname is not available
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const { ProfitFactor, Cagr } = performanceIndicators;
const { Sma, Stoch } = indicators;

const { debug, info } = logger('WalkForward:BacktestTest');

function clearDirectory() {
    const output = path.join(__dirname, 'test-data', 'output');
    del.sync(output);
    fs.mkdirSync(output);
}



class SMAAlgo extends Algorithm {

    // Better: Use Symbol(); issue: name doesn't look nice when they're
    // exported/saved
    fastSMAKey = 'fastSma';
    slowSMAKey = 'slowSma';

    constructor(field, fastSMA, slowSMA) {
        super();
        debug('SMAAlgo: Init with %s %d %d, is %o', field, fastSMA, slowSMA, this);
        this.field = field;
        // Params are floats – convert them to ints
        this.fastSMALength = Math.round(fastSMA, 10);
        this.slowSMALength = Math.round(slowSMA, 10);
    }

    handleNewInstrument(instrument) {
        debug(
            'SMAAlgo: Instrument %o added; fast is %d, slow %d',
            instrument.name,
            this.fastSMALength,
            this.slowSMALength,
        );
        instrument.addTransformer(
            [this.field],
            new Sma(this.fastSMALength),
            this.fastSMAKey,
        );
        instrument.addTransformer(
            [this.field],
            new Sma(this.slowSMALength),
            this.slowSMAKey,
        );
    }


    handleClose(orders, instruments) {

        // Clone orders
        const newOrders = new Map(orders);

        for (const instrument of instruments) {
            debug('onClose, orders are %o, instrument is %o', orders, instrument);
            // We need at least 2 data sets to look back
            if (instrument.data.length < 2) continue;
            const fast = instrument.head().get(this.fastSMAKey);
            const slow = instrument.head().get(this.slowSMAKey);
            const prevFast = instrument.head(1, 1).get(this.fastSMAKey);
            const prevSlow = instrument.head(1, 1).get(this.slowSMAKey);
            info(
                '%s: fast %d slow %d prevFast %d prevSlow %d',
                instrument.name,
                fast,
                slow,
                prevFast,
                prevSlow,
            );
            // If any value is missing, return
            if ([slow, fast, prevSlow, prevFast].includes(undefined)) continue;
            // Cross-over: Buy
            else if (fast > slow && prevFast <= prevSlow) {
                debug('SMA: Create order for %o', instrument.name);
                newOrders.set(instrument, { size: 1 });
            }
            // Cross-under: Short
            else if (fast < slow && prevFast >= prevSlow) {
                debug('SMA: Create order for %o', instrument.name);
                newOrders.set(instrument, { size: -1 });
            }

        }

        // Just log nicely
        const newOrderArray = [];
        for (const [instrument, order] of newOrders) {
            newOrderArray.push(`${instrument.name}:${order.size}`);
        }
        info('Orders in SMAAlgo are', (newOrderArray.length ? newOrderArray.join(', ') : '—'));

        return newOrders;

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

    handleNewInstrument(instrument) {
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

    async handleClose(orders) {

        // Make it async – just to test
        await new Promise(resolve => setTimeout(resolve), Math.random() * 20);

        // Don't rebalance daily – only calculate sizes when orders are available
        if (!orders.size) return orders;

        // Map with key: instrument, value: 1 for long or -1 for short for all orders *AND*
        // current positions (will rebalance)!
        const newPositions = new Map();
        for (const [instrument, position] of this.getCurrentPositions()) {
            newPositions.set(instrument, position.size > 0 ? 1 : -1);
        }
        // If needed, overwrite positions with orders
        for (const [instrument, position] of orders) {
            newPositions.set(instrument, position.size);
        }


        // Current money available (cash + invested)
        const moneyAvailable = this.backtest.accounts.head().get('cash') +
            this.backtest.accounts.head().get('invested');

        info('Accounts is %o', this.backtest.accounts.head());

        // Money that is available per position (every position gets the same amount)
        // 0.9: Keep some cash/prices may change from close to open
        const moneyPerPosition = (moneyAvailable / newPositions.size) * 0.9;
        info('Money available is %d, per position %d', moneyAvailable, moneyPerPosition);

        // Get target positions; key: instrument, value: size
        const targetPositions = new Map();
        for (const [instrument, direction] of newPositions) {
            const close = instrument.head().get('close');
            const size = Math.floor(moneyPerPosition / close);
            targetPositions.set(instrument, size * direction);
            info(
                '%s. Target position is %d, close is %d',
                instrument.name,
                size,
                close,
            );
        }
        // console.log('targetPositions', targetPositions);

        const newOrders = new Map();
        for (const [instrument, targetSize] of targetPositions) {
            const previousSize = this.getCurrentPositions().has(instrument) ?
                this.getCurrentPositions().get(instrument).size : 0;
            // console.log('previousSize', previousSize, targetSize);
            const size = targetSize - previousSize;
            info(
                '%s: Target size %d, previous size %d, order size %d',
                instrument.name,
                targetSize,
                previousSize,
                size,
            );
            newOrders.set(instrument, { size });
        }
        // console.log('newOrders', newOrders);

        const ordersForLog = [];
        for (const [instrument, pos] of newOrders) {
            ordersForLog.push({ instrument: instrument.name, size: pos.size });
        }
        // console.log('Orders are', ordersForLog);

        return newOrders;

    }
}




async function runTest() {

    // Has stream, accounts, optimizations
    const backtest = new Backtest();

    const dataSource = new CSVSource([path.join(__dirname, 'test-data/input/*.csv')]);
    backtest.setDataSource(dataSource);
    backtest.addPerformanceIndicators(new ProfitFactor());
    backtest.addPerformanceIndicators(new Cagr());

    backtest.addOptimization('slowSMA', [1, 3], 3);
    backtest.addOptimization('fastSMA', [2, 4], 3);

    const config = new Map([
        ['cash', 10000],
        // CAREFUL: Use strings as constructor argument because we do the same when reading data
        // from our CSVs. Strings are GMT-based while numbers are based on the local time zone!
        ['startDate', new Date('2018-01-01')],
        ['endDate', new Date('2018-01-20')],
    ]);
    backtest.setConfiguration(config);

    backtest.setStrategy(params => [
        new StochIndicators(3, 1, 2),
        new SMAAlgo('close', params.get('fastSMA'), params.get('slowSMA')),
        // new SMAAlgo('close', 2, 3),
        new EqualPositionSize(),
    ]);

    await backtest.run();
    await backtest.save(path.join(__dirname, 'test-data/output'));

}

/*
Expected results for slow: 3, fast: 2
First and last date of amzn are out of date bounds (see config's startDate and endDate)

Date    Aapl          Amzn
        Slow  Fast     Slow  Fast   Signals
1       -     -        -     -
2       -     11       -     21
3       10.7  10       20.7  20
4       -     -        20.3  20.5   Amzn cross-over
5       10.3  10.5     20.7  21     Aapl cross-over
6       10.7  11       -     -
7       11.7  12       21.7  22
8       -     -        -     -
9       12.7  13.5     22.7  23.5
10      13    13       23    23
11      13    12.5     23    22.5   Aapl & Amzn cross-under
12      13    13.5     21    20.5   Aapl cross-over
13      -     -        -     -
14      13    13       19.3  17.5
15      13    12.5     17    16.5   Aapl cross-under
16      12.3  12.5     -     -      Aapl cross-over
17      -     -        -     -
18      11.3  10.5     -     -
19      9.7   8.5      -     -      Aapl cross-under
20      7.7   7        -     -

Orders
Date
5    428 Amzn
     Amzn c@21 (on 4), cash 10k, 90% = 9k/21 = 428
     Pos value is 428 * 22 = 9416, cash therefore 584
6    Aapl has no data to execute order from 5th (EOD)
12   Aapl -360, Amzn -204
     Money: Amzn c@23 (on 11) = 584 cash + 9844 = 10428 total = 5214 per position * 0.9 = 4692.6
     Aapl c@13 (on 11) = -360; Amzn c@18 = -204
     Old cash is 584. Sold 428 Amzn@18 -> + 7704
     Shorted 360 Aapl@12, shorted 204 Amzn@18; cost = 4320 + 3672
     New cash is 296
13   As there is no data on both Aapl and Amzn, orders will be handled regularily on 14th
14   Aapl 243, Amzn -189
     Money: Cash 296
            + -360 Aapl c@14 (on 12), shortened@12 = 3600
            + -204 Amzn c@18 (on 12), shortened@18 = 3672
            = 7568 * 0.9 / 2 = 3405.6 per position
     Aapl@14 = 243, Amzn@18 = -189
     Old cash 296. Covered 360 Aapl@11 (from 12) = 296 + 4680
     Bought 243 Aapl@11 = -2673
     Covered 15 Amzn@17 (from 18) = 285
     Total cash: 2588
16   Aapl -329
     Money: Cash 2588 + (243 Aapl@13 = 3159) + (-189 Amzn@16 (from 18) = 3780) = 9527
     4287.15 per position. No data for Amzn. Aapl@13, shorten 329
     Old cash 2588, sold 243 Aapl@10 = +2430, shortened 329 Aapl@10 = -3290
     New cash = 1728
19   Should not bring any news …

… WORKS!

 */



test('outputs correct results', async(t) => {
    clearDirectory();
    await runTest();

    const result = compareDir.compareSync(
        path.join(__dirname, 'test-data/output'),
        path.join(__dirname, 'test-data/expected-output'),
        { compareContent: true },
    );

    // console.log('result', result);
    t.is(result.differences, 0);

});



