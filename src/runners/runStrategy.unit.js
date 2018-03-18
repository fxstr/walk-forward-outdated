import test from 'ava';
import runStrategy from './runStrategy';

/**
* Prepares data to test
* @param {array} closeCalls		Array to which all onClose calls of the runner will be added
*/
function setupData(closeCalls = []) {

	const runners = {
		onClose: (orders, instrument, data, account) => {
			closeCalls.push({ orders, instrument, data, account });
			//console.log(orders, instrument, data, account);
			if (data === 3) { return [{ instrument: instrument.instrument, size: 3 }]; }
			if (data === 6) { return [{ instrument: instrument.instrument, size: 2 }]; }
			return orders;
		}
	};

	// Create a fake instrument
	class Instruments {

		instruments = [
			{ name: 'i1', values: [1, 3, 5, 7] },
			{ name: 'i2', values: [2, 4, 6, 20] },
		];
		listeners = [];

		async run() {
			// Create Array with objects: { instrument: instrument, value: value }
			const reformatted = this.instruments.map((instrument) => {
				return instrument.values.map((val) => {
					return { instrument: this.instruments[0], value: val};
				});
			});
			// All instruments with [{ instrument: instrument, value: value }], sorted by
			// value
			const all = [...reformatted[0], ...reformatted[1]].sort((a, b) => a.value - b.value);
			
			// Call listener for every value in this.instruments
			for (const current of all) {
				this.listeners.forEach(async (listener) => {
					await listener({ instrument: current.instrument, data: current.value });
				});
			}

		}

		on(type, listener) {
			// Ignore type
			this.listeners.push(listener);
		}

	}
	const instruments = new Instruments();

	return { runners, instruments };

}



test('calls onClose on runner for all data available', (t) => {
	const closeCalls = [];
	const { runners, instruments } = setupData(closeCalls);
	runStrategy(runners, instruments);
	// onClose should be called for every data set available (8 in total)
	t.is(closeCalls.length, 8);
	// Check first call to close
	t.deepEqual(closeCalls[0], { 
		instrument: { name: 'i1', values: [1, 3, 5, 7] },
		data: 1,
		orders: [],
		account: {},
	});
});


test('runs instruments through runners, returns transformable data series', (t) => {
	t.pass();
});

