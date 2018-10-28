import test from 'ava';
import BacktestInstruments from './BacktestInstruments';

function setupData() {
	// Create a generator function
	const data = [new Map([
		['date', new Date(2018, 0, 1)],
		['instrument', 'aapl'],
		['open', 5],
		['close', 3],
		['high', 5],
	]), new Map([
		['date', new Date(2018, 0, 1)],
		['instrument', '0700'],
		['open', 2],
		['close', 4],
		['high', 4],
	]), new Map([
		['date', new Date(2018, 0, 2)],
		['instrument', 'aapl'],
		['open', 4],
		['close', 2],
		['high', 4],
	]), new Map([
		['date', new Date(2018, 0, 4)],
		['instrument', 'aapl'],
		['open', 6],
		['close', 7],
		['high', 8],
	])];
	async function* generatorFunction() {
		for (const item of data) {
			await new Promise((resolve) => setTimeout(resolve, 10));
			yield item;
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
		yield new Map([['noDateField', true]]);
	}
	const bi = new BacktestInstruments(generatorFunction);
	await t.throwsAsync(() => bi.run(), /contain a date/);
});

test('throws on invalid data (date invalid)', async (t) => {
	async function* generatorFunction() {
		yield new Map([['date', new Date('invalid')]]);
	}
	const bi = new BacktestInstruments(generatorFunction);
	await t.throwsAsync(() => bi.run(), /contain a date/);
});

test('throws on invalid close property', async (t) => {
	async function* generatorFunction() {
		yield new Map([['date', new Date(2010, 0, 1)], ['close', 'invalid']]);
	}
	const bi = new BacktestInstruments(generatorFunction);
	await t.throwsAsync(() => bi.run(), /not a number/);
});

// Not needed as we invalid opens are okay
/*test('throws on invalid open property', async (t) => {
	async function* generatorFunction() {
		yield { date: new Date(2010, 0, 1), close: 5, open: 'invalid' };
	}
	const bi = new BacktestInstruments(generatorFunction);
	const err = await t.throws(bi.run());
	t.is(err.message.indexOf('not numbers') > -1, true);
});*/

test('iterates over generator, emits events for newInstrument', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('newInstrument', dataHandler);
	await bi.run();
	console.log(dataHandled);
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
	t.is(dataHandled[0][0].instrument.data.length, 3);
	// Same instrument for aapl (not a new instance)
	t.is(dataHandled[0][0].instrument, dataHandled[2][0].instrument);
	// Check if instrument was updated correctly
	const tail = dataHandled[0][0].instrument.tail();
	t.is(tail.size, 4);
	t.is(tail.get('close'), 3);
	t.deepEqual(tail.get('date'), new Date(2018, 0, 1));
	t.is(tail.get('high'), 5);
	t.is(tail.get('open'), 5);
});

test('emits the correct data with close event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('close', dataHandler);
	await bi.run();
	// Check data emitted with event 
	const data = dataHandled[0][0].data;
	t.is(data.size, 4);
	t.is(data.get('open'), 5);
	t.is(data.get('close'), 3);
	t.is(data.get('high'), 5);
	t.deepEqual(data.get('date'), new Date(2018, 0, 1));
});

test('updates instrument with open event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	// Check if all open events were fired
	let openEventCount = 0;
	bi.on('open', (...args) => {
		dataHandler(...args);
		// Check instrument's data on first open event
		if (openEventCount === 0) {
			const tail = dataHandled[0][0].instrument.tail();
			t.is(tail.size, 2);
			t.deepEqual(tail.get('date'), new Date(2018, 0, 1));
			t.is(tail.get('open'), 5);
		}
		openEventCount++;
	});
	// Instrument contains only the "open" property at time of open event (not close etc.)
	bi.on('open', (data) => {
		const latestRow = data.instrument.head();
		t.deepEqual(Array.from(latestRow.keys()), ['open', 'date']);
	});
	await bi.run();
	t.is(openEventCount, 4);
	// Check instrument 
	t.is(dataHandled[0][0].instrument.name, 'aapl');
	t.is(dataHandled[1][0].instrument.name, '0700');
	// There were 3 data series for aapl
	t.is(dataHandled[0][0].instrument.data.length, 3);
	// Same instrument for aapl (not a new instance)
	t.is(dataHandled[0][0].instrument, dataHandled[2][0].instrument);
	// Check if instrument was updated correctly
});

test('emits the correct data with open event', async (t) => {
	const { generatorFunction, dataHandler, dataHandled } = setupData();
	const bi = new BacktestInstruments(generatorFunction);
	bi.on('open', dataHandler);
	await bi.run();
	// Event only contains open data (not close etc.)
	const data = dataHandled[0][0].data;
	t.is(data.size, 2);
	t.is(data.get('open'), 5);
	t.deepEqual(data.get('date'), new Date(2018, 0, 1));
});

test('does not fail or emit open if no open data is available', async (t) => {
	async function* generatorFunction() {
		yield new Map([['date', new Date(2018, 0, 1)], ['instrument', 'test'], ['close', 5]]);
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
	bi.on('afterClose', (data) => {
		// data is an array of instruments
		eventOrder.push('afterClose-' + data[0].name);
	});
	bi.on('afterOpen', (data) => {
		// data is an array of instruments
		eventOrder.push('afterOpen-' + data[0].name);
	});
	await bi.run();
	t.deepEqual(eventOrder, [
		'open-aapl', 
		'afterOpen-aapl', 
		'close-aapl', 
		'afterClose-aapl',
		'open-0700', 
		'afterOpen-0700', 
		'close-0700', 
		'afterClose-0700',
		'open-aapl', 
		'afterOpen-aapl', 
		'close-aapl', 
		'afterClose-aapl',
		'open-aapl', 
		'afterOpen-aapl', 
		'close-aapl',
		'afterClose-aapl',
	]);
});

test('backtestMode fires events for all (even the last) generated data', async (t) => {
	// Last instrument does not fire within the for-of-loop but just afterwards (because date does
	// not change)
	const { generatorFunction } = setupData();
	const bi = new BacktestInstruments(generatorFunction, true);
	let instrumentsClosed = 0;
	bi.on('close', () => {
		instrumentsClosed++;
	});
	await bi.run();
	t.is(instrumentsClosed, 4);
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
	bi.on('afterClose', (data) => {
		// Data is an array of instruments
		const instruments = data.map((item) => item.name).join('-');
		eventOrder.push('afterClose-' + instruments);
	});
	bi.on('afterOpen', (data) => {
		// Data is an array of instruments
		const instruments = data.map((item) => item.name).join('-');
		eventOrder.push('afterOpen-' + instruments);
	});
	await bi.run();
	// Latest data set does not emit an event, as we don't yet know if the date has changed 
	// (or if we're at the end as we might be using a continuous stream).
	t.deepEqual(eventOrder, [
		'open-aapl', 
		'open-0700', 
		'afterOpen-aapl-0700', 
		'close-aapl', 
		'close-0700', 
		'afterClose-aapl-0700', 
		'open-aapl', 
		'afterOpen-aapl', 
		'close-aapl',
		'afterClose-aapl',  
		'open-aapl', 
		'afterOpen-aapl', 
		'close-aapl',
		'afterClose-aapl',  
	]);	
});



