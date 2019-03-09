import test from 'ava';
// import groupArrayByValue from '../helpers/groupArrayByValue';
import createTestData from '../helpers/createTestData';
import Instrument from '../instrument/Instrument';
import BacktestInstance from './BacktestInstance';
import Algorithm from '../algorithm/Algorithm';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';
import logger from '../logger/logger';

const log = logger('BacktestInstance.integration');

const baseData = [['aapl', 1, 10, 11]];

/**
 * Creates test data from an array
 * @param  {array} rawInstrumentData    Array with objects, each object containing a property
 *                                      instrument (string) and data (date, open, close)
 * @return {object}
 */
function setupData(rawInstrumentData = baseData) {
    const data = createTestData(rawInstrumentData);
    // Emit close not for every instrument, but for every *date*. To do so, group instrument data
    // by date.
    log.info('raw', data);
    async function* dataGenerator() {
        for (const dataSet of data) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
            yield dataSet;
        }
    }
    const instruments = new BacktestInstruments(dataGenerator);
    const config = new Map([['cash', 50]]);
    return { dataGenerator, instruments, config };
}


test('fails if orders is not an Map', async(t) => {
    class OrderGenerator extends Algorithm {
        handleClose() {
            return 'invalid';
        }
    }
    const { instruments, config } = setupData();
    const bt1 = new BacktestInstance(instruments, [new OrderGenerator()], config);
    await t.throwsAsync(() => bt1.run(), /orders returned is not a Map/);
});



test('fails if order data is not valid', async(t) => {

    const aapl = new Instrument('aapl');

    // Instrument missing
    class NoInstrumentAlgo extends Algorithm {
        handleClose() {
            return new Map([['invalid', { size: 2 }]]);
        }
    }

    // Invalid size
    class InvalidSizeAlgo extends Algorithm {
        handleClose() {
            return new Map([[aapl, { size: 'name' }]]);
        }
    }

    // Size missing
    class NoSizeAlgo extends Algorithm {
        handleClose() {
            return new Map([[aapl, { otherKey: 2 }]]);
        }
    }

    const bt1 = new BacktestInstance(
        setupData().instruments,
        [new NoInstrumentAlgo()],
        setupData().config,
    );
    await t.throwsAsync(() => bt1.run(), /must be an instance of Instrument/);

    const bt2 = new BacktestInstance(
        setupData().instruments,
        [new NoSizeAlgo()],
        setupData().config,
    );
    await t.throwsAsync(() => bt2.run(), /order must have an size property/);

    const bt3 = new BacktestInstance(
        setupData().instruments,
        [new InvalidSizeAlgo()],
        setupData().config,
    );
    await t.throwsAsync(() => bt3.run(), /size property must be a number/);
});



test('awaits close and newInstrument handlers', async(t) => {
    const rawData = [
        ['aapl', 1, 10, 11],
        ['aapl', 2, 12, 13],
    ];
    let called = 0;
    class OrderGenerator extends Algorithm {
        async handleClose(orders, instruments) {
            await new Promise(resolve => setTimeout(resolve, 10));
            called++;
            return new Map([[instruments[0], { size: 1 }]]);
        }
        async handleNewInstrument() {
            await new Promise(resolve => setTimeout(resolve, 10));
            called++;
        }
    }
    const { instruments } = setupData(rawData);
    const config = new Map([['cash', 1000]]);
    const bt = new BacktestInstance(instruments, [new OrderGenerator()], config);
    await bt.run();
    t.is(called, 3);
});


test('account is ready on first close', async(t) => {
    const rawData = [
        ['aapl', 1, 10, 11],
    ];
    class OrderGenerator extends Algorithm {
        // Buy 1 of each instrurment on 1st, sell 1 of each instrument on 2nd
        async handleClose() {
            t.is(this.backtest.accounts.head().get('cash'), 1000);
            t.is(this.backtest.accounts.head().get('invested'), 0);
            return new Map();
        }
    }
    const { instruments } = setupData(rawData);
    const config = new Map([['cash', 1000]]);
    const bt = new BacktestInstance(instruments, [new OrderGenerator()], config);
    await bt.run();
});


test(
    'account is updated with close prices before handleClose is called on algos',
    async(t) => {
        const rawData = [
            ['aapl', 1, 10, 11],
            ['aapl', 2, 11, 12],
        ];
        class OrderGenerator extends Algorithm {
            // Buy 1 on 1st
            async handleClose(orders, instruments) {
                const newOrders = new Map();
                // There's just 1 instrument
                for (const instrument of instruments) {
                    // 1st
                    if (instrument.head().get('date').getDate() === 1) {
                        newOrders.set(instrument, { size: 1 });
                    }
                    else {
                        // 2nd – bought 1 aapl@11
                        t.is(this.getAccounts().head().get('cash'), 89);
                        // Close price of 2nd (aapl@12), not opening price
                        t.is(this.getAccounts().head().get('invested'), 12);
                    }
                }
                return newOrders;
            }
        }
        const { instruments } = setupData(rawData);
        const config = new Map([['cash', 100]]);
        const bt = new BacktestInstance(instruments, [new OrderGenerator()], config);
        await bt.run();
    },
);

test('updates accounts', async(t) => {
    const rawData = [
        ['aapl', 1, 10, 11],
        ['0700', 1, 5, 6],
        ['aapl', 2, 12, 13],
        ['0700', 2, 6, 6],
        ['aapl', 3, 12, 11],
        ['0700', 3, 5, 7],
    ];
    class OrderGenerator extends Algorithm {
        // Buy 1 of each instrurment on 1st, sell 1 of each instrument on 2nd
        async handleClose(orders, instruments) {
            const date = instruments[0].head().get('date').getDate();
            let size = 0;
            if (date === 1) size = 1;
            else if (date === 2) size = -1;
            const newOrders = new Map();
            instruments.forEach(instrument => newOrders.set(instrument, { size }));
            return newOrders;
        }
    }
    const { instruments } = setupData(rawData);
    const config = new Map([['cash', 1000]]);
    const bt = new BacktestInstance(instruments, [new OrderGenerator()], config);
    await bt.run();
    t.deepEqual(bt.accounts.data, [
        new Map([
            ['date', new Date(2018, 0, 1)],
            ['type', 'open'],
            ['cash', 1000],
            ['invested', 0],
        ]),
        new Map([
            ['date', new Date(2018, 0, 1)],
            ['type', 'close'],
            ['cash', 1000],
            ['invested', 0],
        ]),
        // Buy 1 aapl@12, 1 0700@6
        new Map([
            ['date', new Date(2018, 0, 2)],
            ['type', 'open'],
            ['cash', 982],
            ['invested', 18],
        ]),
        // aapl@13, 0700@6
        new Map([
            ['date', new Date(2018, 0, 2)],
            ['type', 'close'],
            ['cash', 982],
            ['invested', 19],
        ]),
        // sell 1 aapl@12, 1 0700@5
        new Map([
            ['date', new Date(2018, 0, 3)],
            ['type', 'open'],
            ['cash', 999],
            ['invested', 0],
        ]),
        new Map([
            ['date', new Date(2018, 0, 3)],
            ['type', 'close'],
            ['cash', 999],
            ['invested', 0],
        ]),
    ]);
});



test(
    'calls handleNewInstrument and handleClose in correct order with correct arguments',
    async(t) => {

        const rawData = [
            ['aapl', 1, 3, 2],
            ['0700', 3, 2, 3],
            ['aapl', 3, 3, 4],
        ];

        const events = [];
        class OrderAlgo extends Algorithm {
            handleClose(order, instruments) {
                events.push({
                    type: 'close',
                    arguments: [order, instruments],
                });
                return order;
            }
            handleNewInstrument(instrument) {
                events.push({
                    type: 'newInstrument',
                    arguments: [instrument],
                });
            }
        }

        const { instruments, config } = setupData(rawData);
        const bt = new BacktestInstance(instruments, [new OrderAlgo()], config);
        await bt.run();

        const aapl = instruments.instruments.get('aapl');
        const tencent = instruments.instruments.get('0700');

        t.is(events.length, 4);
        t.deepEqual(events[0], { type: 'newInstrument', arguments: [aapl] });
        t.deepEqual(events[1], {
            type: 'close',
            arguments: [new Map(), [aapl]],
        });
        t.deepEqual(events[2], { type: 'newInstrument', arguments: [tencent] });
        // Instruments are sorted by alphabet, see createTestData
        t.deepEqual(events[3], {
            type: 'close',
            arguments: [new Map(), [tencent, aapl]],
        });

    },
);




test('updates positions and account', async(t) => {

    const rawData = [
        // Jan 1
        ['aapl', 1, 3, 4],
        ['0700', 1, 5, 3],

        // Jan 2 (no 0700, cannot be ordered)
        ['aapl', 2, 4, 5],

        // Jan 3
        ['0700', 3, 4, 6],
        ['aapl', 3, 2, 3],

        // Jan 4
        // Add some more data so that we can execute the previous trades on open
        ['0700', 4, 3, 5],
        ['aapl', 4, 4, 3],
    ];

    /**
     * Creates orders for aapl and 0700 based on instrument and date
     */
    class BaseOrderAlgo extends Algorithm {
        handleClose(orders, instruments) {
            const newOrders = new Map();
            for (const instrument of instruments) {
                const { name } = instrument;
                const date = instrument.head().get('date').getDate();
                if (name === 'aapl' && date === 1) newOrders.set(instrument, { size: 2 });
                // Won't be executed, validity is 1 bar
                if (name === '0700' && date === 1) newOrders.set(instrument, { size: 3 });
                if (name === '0700' && date === 3) newOrders.set(instrument, { size: -2 });
                if (name === 'aapl' && date === 3) newOrders.set(instrument, { size: -3 });
            }
            return newOrders;
        }
    }

    /**
     * Reduces the size of every order by 1
     */
    class ReduceOrderSizeBy1Algo extends Algorithm {
        handleClose(orders) {
            const newOrders = new Map();
            for (const [instrument, order] of orders) {
                newOrders.set(instrument, { size: order.size - 1 });
            }
            return newOrders;
        }
    }

    const { instruments, config } = setupData(rawData);
    const bt = new BacktestInstance(
        instruments,
        [new BaseOrderAlgo(), new ReduceOrderSizeBy1Algo()],
        config,
    );
    await bt.run();

    const aapl = instruments.instruments.get('aapl');
    const tencent = instruments.instruments.get('0700');

    t.deepEqual(
        // Use tail to get oldest first. Two entries per day, 4 days = 8 entries total.
        bt.positions.tail(14),
        [

            // Jan 1
            new Map([
                ['date', new Date(2018, 0, 1)],
                ['type', 'open'],
            ]),
            new Map([
                ['date', new Date(2018, 0, 1)],
                ['type', 'close'],
            ]),

            // Jan 2
            new Map([
                [aapl, {
                    size: 1,
                    value: 4,
                    positions: [{ size: 1, value: 4, openPrice: 4 }],
                }],
                ['date', new Date(2018, 0, 2)],
                ['type', 'open'],
            ]),
            new Map([
                [aapl, {
                    size: 1,
                    value: 5,
                    positions: [{ size: 1, value: 5, openPrice: 4 }],
                }],
                ['date', new Date(2018, 0, 2)],
                ['type', 'close'],
            ]),

            // Jan 3
            new Map([
                [aapl, {
                    size: 1,
                    value: 2,
                    positions: [{ size: 1, value: 2, openPrice: 4 }],
                }],
                ['date', new Date(2018, 0, 3)],
                ['type', 'open'],
            ]),
            new Map([
                [aapl, {
                    size: 1,
                    value: 3,
                    positions: [{ size: 1, value: 3, openPrice: 4 }],
                }],
                ['date', new Date(2018, 0, 3)],
                ['type', 'close'],
            ]),

            // Jan 4
            // aapl was 1 + -3 = -3
            // 0700 was 0 + -3 = -3
            new Map([
                [
                    aapl,
                    {
                        size: -3,
                        value: 12,
                        positions: [{ size: -3, value: 12, openPrice: 4 }],
                        closedPositions: [{ size: 1, value: 4, openPrice: 4 }],
                    },
                ], [
                    tencent,
                    {
                        size: -3,
                        value: 9,
                        positions: [{ size: -3, value: 9, openPrice: 3 }],
                    },
                ],
                ['date', new Date(2018, 0, 4)],
                ['type', 'open'],
            ]),
            new Map([
                [
                    aapl,
                    {
                        size: -3,
                        value: 15,
                        positions: [{ size: -3, value: 15, openPrice: 4 }],
                        closedPositions: [{ size: 1, value: 4, openPrice: 4 }],
                    },
                ], [
                    tencent,
                    {
                        size: -3,
                        value: 3,
                        positions: [{ size: -3, value: 3, openPrice: 3 }],
                    },
                ],
                ['date', new Date(2018, 0, 4)],
                ['type', 'close'],
            ]),

        ],
    );

});




