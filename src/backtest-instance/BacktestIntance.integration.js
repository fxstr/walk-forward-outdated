import test from 'ava';
import createTestData from '../helpers/createTestData';
import BacktestInstance from './BacktestInstance';
import Algorithm from '../algorithm/Algorithm';
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
	const err = await t.throws(bt1.run());
	t.is(err.message.includes('returned invalid orders'), true);
});


test('fails if order data is not valid', async (t) => {
	const { instruments, config } = setupData();
	// Invalid size
	class OrderGenerator1 extends Algorithm {
		onClose() {
			return [{ size: 'name' }];
		}
	}
	// Instrument missing
	class OrderGenerator2 extends Algorithm {
		onClose() {
			return [{ size: 2 }];
		}
	}
	// Size missing
	class OrderGenerator3 extends Algorithm {
		onClose() {
			return [{ instrument: 2 }];
		}
	}
	const bt1 = new BacktestInstance(instruments, new OrderGenerator1(), config);
	const err1 = await t.throws(bt1.run());
	const bt2 = new BacktestInstance(instruments, new OrderGenerator2(), config);
	const err2 = await t.throws(bt2.run());
	const bt3 = new BacktestInstance(instruments, new OrderGenerator3(), config);
	const err3 = await t.throws(bt3.run());
	t.is(err1.message.indexOf('which is a number') > -1, true);
	t.is(err2.message.indexOf('which is a number') > -1, true);
	t.is(err3.message.indexOf('which is a number') > -1, true);
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


test('calls orderGenerator with corret parameters', async (t) => {
    let orderGeneratorParams;
    class OrderGenerator extends Algorithm {
        onClose(...params) {
            orderGeneratorParams = params;
            return [];
        }
    }
    const { instruments, config } = setupData();
    const bt = new BacktestInstance(instruments, new OrderGenerator(), config);
    await bt.run();
    t.is(orderGeneratorParams.length, 2);
    // First param: orders (empty array)
    t.deepEqual(orderGeneratorParams[0], []);
    // Second param: Instrument
    t.is(orderGeneratorParams[1] instanceof Instrument, true);
    t.is(orderGeneratorParams[1].head().get('open'), 10);
    t.is(orderGeneratorParams[1].head().get('close'), 11);
    t.deepEqual(orderGeneratorParams[1].head().get('date'), new Date(2018, 0, 1));
    t.deepEqual(orderGeneratorParams[1].name, 'aapl');
});


test('calls onNewInstrument when they are initialized', async (t) => {

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


