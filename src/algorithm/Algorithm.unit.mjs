import test from 'ava';
import Algorithm from './Algorithm.mjs';
import DataSeries from '../data-series/DataSeries.mjs';
import Instrument from '../instrument/Instrument.mjs';

function setupData() {
    const backtest = {
        instruments: {
            handlers: [],
            on(type, fn) {
                this.handlers.push({ type, callback: fn });
            },
            async emit(type, data) {
                for (const handler of this.handlers) {
                    if (handler.type === type) await handler.callback(data);
                }
            },
        },
    };
    return { backtest };
}

test('returns first param on handleClose', (t) => {
    const algo = new Algorithm();
    const result = algo.handleClose('test');
    t.is(result, 'test');
});

test('removes date and type for getCurrentPositions', (t) => {
    const ds = new DataSeries();

    const instrument1 = new Instrument('name1');
    const instrument2 = new Instrument('name2');
    const instrument3 = new Instrument('name3');

    ds.add(new Map([
        // Valid (positive/negative size)
        [instrument1, { size: 5 }],
        [instrument2, { size: -5 }],
        // Invalid, instrument is not instance of Instrument
        ['somethingElse', { size: 5 }],
        [null, { size: 5 }],
        // Invalid, size is 0
        [instrument3, { size: 0 }],
    ]));

    const algo = new Algorithm();
    const { backtest } = setupData();
    backtest.positions = ds;
    algo.setBacktest(backtest);
    console.log('curpos %o', algo.getCurrentPositions().size);
    t.deepEqual(
        algo.getCurrentPositions(),
        new Map([
            [instrument1, { size: 5 }],
            [instrument2, { size: -5 }],
        ]),
    );

});



