import test from 'ava';
import BacktestInstruments from './BacktestInstruments';

function setupData() {
	// Create a generator function
	const data = [{
		date: new Date(2018, 0, 1),
		instrument: 'aapl',
		open: 5,
		close: 3,
		high: 5,
	}, {
		date: new Date(2018, 0, 1),
		instrument: '0700',
		open: 2,
		close: 4,
		high: 4,
	}, {
		date: new Date(2018, 0, 2),
		instrument: 'aapl',
		open: 4,
		close: 2,
		high: 4,
	}, {
		date: new Date(2018, 0, 4),
		instrument: 'aapl',
		open: 6,
		close: 7,
		high: 8,
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
		dataHandled.push(data);
	}

	return { generatorFunction, dataHandler, dataHandled };
}

test('throws on invalid arguments', (t) => {
	t.throws(() => new BacktestInstruments(), /generator function/);
});

test('throws on invalid data (date missing)', async (t) => {
	async function* generatorFunction() {
		yield { noDateField: true };
	}
	const bi = new BacktestInstruments(generatorFunction);
	const err = await t.throws(bi.run());
	t.is(err.message.indexOf('contain a date') > -1, true);
});

test('iterates over generator, emits events for newInstrument', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('newInstrument', dataHandler);
	await bi.run();
	t.is(dataHandled.length, 2);
	t.is(dataHandled[0][0].name, 'aapl');
	t.is(dataHandled[1][0].name, '0700');
});

test('updates instrument with close event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('close', dataHandler);
	await bi.run();
	// Check instrument 
	t.is(dataHandled[0][0].instrument.name, 'aapl');
	t.is(dataHandled[1][0].instrument.name, '0700');
	// There were 3 data series for aapl
	t.is(dataHandled[0][0].instrument.data.data.length, 3);
	// Same instrument for aapl (not a new instance)
	t.is(dataHandled[0][0].instrument, dataHandled[2][0].instrument);
});

test('emits the correct data with close event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('close', dataHandler);
	await bi.run();
	// Check instrument 
	t.deepEqual(dataHandled[0][0].data, {
		open: 5,
		close: 3,
		high: 5
	});
});

test('updates instrument with open event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('open', dataHandler);
	// Instrument only contains open property at time of open event
	bi.on('open', (data) => {
		const latestRow = data.instrument.data.head();
		t.deepEqual(Object.keys(latestRow.data), ['open']);
	});
	await bi.run();
	// Check instrument 
	t.is(dataHandled[0][0].instrument.name, 'aapl');
	t.is(dataHandled[1][0].instrument.name, '0700');
	// There were 3 data series for aapl
	t.is(dataHandled[0][0].instrument.data.data.length, 3);
	// Same instrument for aapl  (not a new instance)
	t.is(dataHandled[0][0].instrument, dataHandled[2][0].instrument);
});

test('emits the correct data with open event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('open', dataHandler);
	await bi.run();
	// Event only contains open data (not close etc.)
	t.deepEqual(dataHandled[0][0].data, { open: 5 });
});

test('does not fail or emit open if no open data is available', async (t) => {
	async function* generatorFunction() {
		yield { date: new Date(2018, 0, 1), instrument: 'test' };
	}
	const openEvents = [];
	const closeEvents = [];
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('close', (data) => closeEvents.push(data));
	bi.on('open', (data) => openEvents.push(data));
	await bi.run();
	t.is(closeEvents.length, 1);
	t.is(openEvents.length, 0);
});

test('regular (non-backtest) mode has the right events and order', async (t) => {
	const { generatorFunction } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	const eventOrder = [];
	bi.on('open', (data) => {
		eventOrder.push('open-' + data.instrument.name);
	});
	bi.on('close', (data) => {
		eventOrder.push('close-' + data.instrument.name);
	});
	await bi.run();
	t.deepEqual(eventOrder, ['open-aapl', 'close-aapl', 'open-0700', 'close-0700', 
		'open-aapl', 'close-aapl', 'open-aapl', 'close-aapl']);
});

test('backtestMode has the right events and order', async (t) => {
	const { generatorFunction } = setupData();
	const bi = new BacktestInstruments(generatorFunction, true);
	const eventOrder = [];
	bi.on('open', (data) => {
		eventOrder.push('open-' + data.instrument.name);
	});
	bi.on('close', (data) => {
		eventOrder.push('close-' + data.instrument.name);
	});
	await bi.run();
	// Latest data set does not emit an event, as we don't yet know if the date has changed 
	// (or if we're at the end as we might be using a continuous stream).
	t.deepEqual(eventOrder, ['open-aapl', 'open-0700', 'close-aapl', 'close-0700', 
		'open-aapl', 'close-aapl']);	
	t.pass();
});




