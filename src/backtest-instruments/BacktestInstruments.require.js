import test from 'ava';
import BacktestInstruments from './BacktestInstruments';

function setupData() {

	// Create a generator function
	const data = [{
		date: new Date(2018, 0, 1),
		instrument: 'aapl',
		open: 5,
	}, {
		date: new Date(2018, 0, 1),
		instrument: '0700',
		open: 2,
	}, {
		date: new Date(2018, 0, 2),
		instrument: 'aapl',
		open: 4,
	}, {
		date: new Date(2018, 0, 4),
		instrument: 'aapl',
		open: 6,
	}];
	let currentIndex = 0;
	async function* generatorFunction() {
		while (currentIndex < data.length) {
			await new Promise((resolve) => setTimeout(resolve, 10));
			yield data[currentIndex];
			currentIndex++;
		}
	}

	// Define a simple handler that pushes all calls's arguments to dataParameters
	const dataHandled = [];
	function dataHandler(...data) {
		dataHandled.push(...data);
	}

	const newInstrumentsHandled = [];

	return { generatorFunction, dataHandler, dataHandled };
}

test('throws on invalid arguments', (t) => {
	t.throws(() => new BacktestInstruments(), /generator function/);
});

test('iterates over generator, emits events for newInstrument', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('newInstrument', dataHandler);
	await bi.run();
	t.is(dataHandled.length, 2);
	t.is(dataHandled[0].name, 'aapl');
	t.is(dataHandled[1].name, '0700');
});

test('iterates over generator, emits events for data', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('data', dataHandler);
	await bi.run();
	// Check amount of emitted events (one per data set)
	t.is(dataHandled.length, 4);
	// Check instrument 
	t.is(dataHandled[0].instrument.name, 'aapl');
	t.is(dataHandled[1].instrument.name, '0700');
	// There were 3 data series for aapl
	t.is(dataHandled[0].instrument.data.data.length, 3);
	// Same instrument for aapl
	t.is(dataHandled[0].instrument, dataHandled[2].instrument);
});