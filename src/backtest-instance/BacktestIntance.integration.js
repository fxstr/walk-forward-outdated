import test from 'ava';
import createTestData from '../helpers/createTestData';
import BacktestInstance from './BacktestInstance';
import Algorithm from '../algorithm/Algorithm';
import { runThrough } from '../runners/runners';
import Instrument from '../instrument/Instrument';
import BacktestInstruments from '../backtest-instruments/BacktestInstruments';

const baseData = [['aapl', 1, 10, 11]];

/**
 * Creates test data from an array
 * @param  {array} rawInstrumentData	Array with objects, each object containing a property 
 *                                   	instrument (string) and data (date, open, close)
 * @return {object}
 */
function setupData(rawInstrumentData = baseData) {
	const data = createTestData(rawInstrumentData);
	let currentIndex = 0;
	function* dataGenerator() {
		while (currentIndex < data.length) {
			yield data[currentIndex++];
		}
	}

	const instruments = new BacktestInstruments(dataGenerator, true);
	const config = new Map([['cash', () => 50]]);

	return { dataGenerator, instruments, config };
}


test('fails if orders is not an array', async (t) => {
	class OrderGenerator extends Algorithm {
		onClose() {
			return 'invalid';
		}
	}
	const { instruments, config } = setupData();
	const bt1 = new BacktestInstance(instruments, new OrderGenerator(), config);
	await t.throwsAsync(() => bt1.run(), /returned invalid orders/);
});


test('fails if order data is not valid', async (t) => {

    // Instrument missing
    class NoInstrumentGenerator extends Algorithm {
        onClose() {
            return [{ size: 2 }];
        }
    }

	// Invalid size
	class InvalidSizeGenerator extends Algorithm {
		onClose() {
			return [{ size: 'name', instrument: 2 }];
		}
	}

	// Size missing
	class NoSizeGenerator extends Algorithm {
		onClose() {
			return [{ instrument: 2 }];
		}
	}

	const bt1 = new BacktestInstance(setupData().instruments, new NoInstrumentGenerator(), setupData().config);
	await t.throwsAsync(() => bt1.run(), /must have an instrument property/);

	const bt2 = new BacktestInstance(setupData().instruments, new NoSizeGenerator(), setupData().config);
    await t.throwsAsync(() => bt2.run(), /order must have an size property/);

	const bt3 = new BacktestInstance(setupData().instruments, new InvalidSizeGenerator(), setupData().config);
    await t.throwsAsync(() => bt3.run(), /size property must be a number/);
});




test('awaits orderGenerator', async (t) => {
	const rawData = [
		['aapl', 1, 10, 11],
		['aapl', 2, 12, 13],
	];
	let called = 0;
	class OrderGenerator extends Algorithm {
		onClose(orders, instrument) {
			return new Promise((resolve) => setTimeout(() => {
				called++;
				resolve([{ instrument: instrument, size: 1 }]);
			}), 10);
		}
	}
	const { instruments } = setupData(rawData);
	const config = new Map([['cash', () => 1000]]);
	const bt = new BacktestInstance(instruments, new OrderGenerator(), config);
	await bt.run();
	t.is(called, 2);
});


/* test('updates orders correctly', async (t) => {
    // We want to make sure bt.setOrders is only called once (by runThrough) and not by every
    // Algorithm
    const rawData = [
        ['aapl', 1, 10, 11],
    ];
    class OrderGenerator1 extends Algorithm {
        onClose(orders, instrument) {
            return [{ instrument: instrument, size: 5 }];
        }
    }
    const { instruments } = setupData(rawData);
    const config = new Map([['cash', () => 1000]]);
    const runner = runThrough(new OrderGenerator1());
    const bt = new BacktestInstance(instruments, runner, config);

    // Create a spy for setOrders
    const calls = [];
    const originalFunction = bt.setOrders;
    bt.setOrders = function(...args) {
        calls.push(args);
        console.log('Args are %o', args);
        return originalFunction.call(bt, ...args);
    };

    await bt.run();
    
    t.is(calls.length, 1);
    t.deepEqual(calls[0], { instrument: instruments.instruments[0], size: 5 });

}); */


test('calls orderGenerator with corret parameters', async (t) => {
    const orderGeneratorParams = [];
    class OrderGenerator extends Algorithm {
        onClose(...params) {
            orderGeneratorParams.push(params);
            return [];
        }
    }
    const { instruments, config } = setupData();
    const bt = new BacktestInstance(instruments, new OrderGenerator(), config);
    await bt.run();

    t.is(orderGeneratorParams.length, 1);

    // Data for aapl on first day
    const firstParam = orderGeneratorParams[0];
    t.is(firstParam.length, 2);
    // First param: orders (empty array)
    t.deepEqual(firstParam[0], []);
    // Second param: Instrument
    t.is(firstParam[1] instanceof Instrument, true);
    t.is(firstParam[1].head().get('open'), 10);
    t.is(firstParam[1].head().get('close'), 11);
    t.deepEqual(firstParam[1].head().get('date'), new Date(2018, 0, 1));
    t.deepEqual(firstParam[1].name, 'aapl');
});


test('calls onNewInstrument and onClose in correct order', async (t) => {

    const rawData = [
        ['aapl', 1, 3, 2],
        ['0700', 3, 2, 3],
        ['aapl', 3, 3, 4],
    ];

    const events = [];
    class OrderGenerator extends Algorithm {
        onClose(order, instrument) {
            events.push({ type: 'close', instrument: instrument });
            return []; 
        }
        onNewInstrument(instrument) {
            events.push({ type: 'newInstrument', instrument: instrument });
        }
    }

    const { instruments, config } = setupData(rawData);
    const bt = new BacktestInstance(instruments, new OrderGenerator(), config);
    await bt.run();

    t.is(events.length, 5);
    t.is(events[0].type, 'newInstrument');
    t.is(events[0].instrument.name, 'aapl');
    t.is(events[2].type, 'newInstrument');
    t.is(events[2].instrument.name, '0700');

});




test('handles orders correctly', async (t) => {

    const rawData = [
        ['aapl', 3, 3, 4],
    ];

    class OrderGenerator extends Algorithm {
        onClose(orders, instrument) {
            return [{ instrument, size: 3 }];
        }
    }
    class EnlargeOrder extends Algorithm {
        onClose(orders) {
            orders.forEach(order => order.size += 2);
            return orders;
        }
    }

    const { instruments, config } = setupData(rawData);
    const bt = new BacktestInstance(
        instruments,
        runThrough(new OrderGenerator(), new EnlargeOrder),
        config
    );
    await bt.run();

    t.deepEqual(bt.orders, [{ instrument: instruments.instruments[0], size: 5 }]);

});




