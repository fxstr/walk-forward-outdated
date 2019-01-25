import test from 'ava';
import Algorithm from './Algorithm';
import DataSeries from '../data-series/DataSeries';
import Instrument from '../instrument/Instrument';

function setupData() {
    const backtest = {
        setOrders(newOrders) {
            this.orders = newOrders;
        },
        orders: [],
        instruments: {
            handlers: [],
            on: function(type, fn) {
                this.handlers.push({ type: type, callback: fn });
            },
            emit: async function(type, data) {
                for (const handler of this.handlers) { 
                    if (handler.type === type) await handler.callback(data);
                }
            }
        }
    };
    return { backtest };
}

test('returns first param on onClose', (t) => {
    const algo = new Algorithm();
    const result = algo.onClose('test');
    t.is(result, 'test');
});

/* test('calls onClose on close', async (t) => {
    const { backtest } = setupData();
    let called = 0;
    class MyAlgo extends Algorithm {
        onClose() {
            called++;
        }
    }
    const myAlgo = new MyAlgo();
    myAlgo.setBacktest(backtest);
    await backtest.instruments.emit('close', { instrument: 'myInstrument' });
    await backtest.instruments.emit('close', { instrument: 'myInstrument' });
    t.is(called, 2);
});


test('calls onClose with correct arguments', async (t) => {
    const { backtest } = setupData();
    let allArgs = [];
    class MyAlgo extends Algorithm {
        onClose(...params) {
            allArgs.push(params);
        }
    }
    const myAlgo = new MyAlgo();
    myAlgo.setBacktest(backtest);
    const instrument = { instrument: 'myInstrument' };
    await backtest.instruments.emit('close', instrument);
    t.deepEqual(allArgs, [[[], 'myInstrument']]);
});


test('calls setOrders with generated orders', async (t) => {
    const { backtest } = setupData();
    class MyAlgo extends Algorithm {
        onClose(orders, instrument) {
            return [...orders, { instrument: instrument, size: 3 }];
        }
    }
    const myAlgo = new MyAlgo();
    myAlgo.setBacktest(backtest);
    const instrument = { instrument: 'myInstrument' };
    await backtest.instruments.emit('close', instrument);
    t.deepEqual(backtest.orders, [{ instrument: 'myInstrument', size: 3 }]);
});


test('calls onNewInstrument with correct data', (t) => {
    const { backtest } = setupData();
    const instruments = [];
    class MyAlgo extends Algorithm {
        onNewInstrument(instrument) {
            instruments.push(instrument);
        }
    }
    const myAlgo = new MyAlgo();
    myAlgo.setBacktest(backtest);
    const instrument = { instrument: 'myInstrument' };
    backtest.instruments.emit('newInstrument', instrument);
    t.deepEqual(instruments, [instrument]);
}); */


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
        [instrument3, { size: 0 }]
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
            [instrument2, { size: -5 }]
        ]),
    );

});



