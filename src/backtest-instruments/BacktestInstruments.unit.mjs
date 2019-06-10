import test from 'ava';
import BacktestInstruments from './BacktestInstruments';

function setupData() {
    // Create a generator function
    const data = [
        [
            new Map([
                ['date', new Date(2018, 0, 1)],
                ['instrument', 'aapl'],
                ['open', 5],
                ['close', 3],
                ['high', 5],
            ]),
        ], [
            new Map([
                ['date', new Date(2018, 0, 2)],
                ['instrument', 'aapl'],
                ['open', 4],
                ['close', 2],
                ['high', 4],
            ]), new Map([
                ['date', new Date(2018, 0, 2)],
                ['instrument', '0700'],
                ['open', 2],
                ['close', 4],
                ['high', 4],
            ]),
        ], [
            new Map([
                ['date', new Date(2018, 0, 4)],
                ['instrument', 'aapl'],
                ['open', 6],
                ['close', 7],
                ['high', 8],
            ]),
        ],
    ];
    async function* generatorFunction() {
        for (const item of data) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
            yield item;
        }
    }

    // Define a simple handler that pushes all calls's arguments to dataParameters
    /* const dataHandled = [];
    function dataHandler(...argumentData) {
        dataHandled.push(argumentData);
    } */

    return { generatorFunction };
}

test('throws on invalid arguments', (t) => {
    t.throws(() => new BacktestInstruments(), /generator function/);
    t.throws(() => new BacktestInstruments(() => {}, 'notADate'), /if startDate is provided/);
    t.throws(
        () => new BacktestInstruments(() => {}, new Date(), 'notADate'),
        /if endDate is provided/,
    );
});

// For details on error handling, see checkInstrumentData()
test('throws on invalid data (date missing)', async(t) => {
    async function* generatorFunction() {
        yield [new Map([['noDateField', true]])];
    }
    const bi = new BacktestInstruments(generatorFunction);
    await t.throwsAsync(() => bi.run(), /valid date field/);
});


test('iterates over generator, emits events for newInstrument', async(t) => {
    const { generatorFunction } = setupData();
    const bi = new BacktestInstruments(generatorFunction);
    const handled = [];
    bi.on('newInstrument', instrument => handled.push(instrument));
    await bi.run();
    t.is(handled.length, 2);
    t.is(handled[0].name, 'aapl');
    t.is(handled[1].name, '0700');
});

test('respects startDate and endDate', async(t) => {
    const { generatorFunction } = setupData();
    const bi = new BacktestInstruments(
        generatorFunction,
        // Use different dates to check if start/end date are used correctly
        new Date(2018, 0, 1, 1, 0, 0),
        new Date(2018, 0, 2, 1, 0, 0),
    );

    const handled = [];
    bi.on('close', instruments => handled.push(instruments));
    await bi.run();
    t.is(handled.length, 1);
});

test('updates instrument with open data and emits open event', async(t) => {
    const { generatorFunction } = setupData();
    const bi = new BacktestInstruments(generatorFunction);
    // Check if all open events were fired
    let openEventsFiredCount = 0;
    bi.on('open', (instruments) => {
        // Check instrument's data on first open event
        if (openEventsFiredCount === 0) {
            t.is(instruments.length, 1);
            const aapl = instruments[0];
            t.deepEqual(aapl.head(), new Map([
                ['date', new Date(2018, 0, 1)],
                ['open', 5],
            ]));
        }
        openEventsFiredCount++;
    });
    await bi.run();
    // Open fired for every day, i.e. 3 times
    t.is(openEventsFiredCount, 3);
});




test('updates instrument with close data and emits close event', async(t) => {
    const { generatorFunction } = setupData();
    const bi = new BacktestInstruments(generatorFunction);
    let closeEventsEmittedCount = 0;
    bi.on('close', (instruments) => {
        if (closeEventsEmittedCount === 0) {
            const aapl = instruments[0];
            t.deepEqual(aapl.head(), new Map([
                ['date', new Date(2018, 0, 1)],
                ['open', 5],
                ['close', 3],
                ['high', 5],
            ]));
        }
        closeEventsEmittedCount++;
    });
    await bi.run();
    // Close is emitted for every date
    t.is(closeEventsEmittedCount, 3);
});



test('emits events in correct order, awaits handlers', async(t) => {

    const eventsFired = [];
    function createHandlerFunction(type) {
        return async(instruments) => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
            // Instruments is an array for open and close and the instrument itself for
            // newInstrument
            const instrumentsArray = (Array.isArray(instruments)) ? instruments : [instruments];
            const instrumentNames = instrumentsArray.map(instrument => instrument.name).join('-');
            const name = `${type}-${instrumentNames}`;
            eventsFired.push(name);
        };
    }

    const { generatorFunction } = setupData();
    const bi = new BacktestInstruments(generatorFunction);

    bi.on('close', createHandlerFunction('close'));
    bi.on('open', createHandlerFunction('open'));
    bi.on('newInstrument', createHandlerFunction('newInstrument'));

    await bi.run();

    t.deepEqual(eventsFired, [
        'newInstrument-aapl',
        'open-aapl',
        'close-aapl',
        // newInstrument is fired before open is fired on any of the instruments of that interval
        'newInstrument-0700',
        'open-aapl-0700',
        'close-aapl-0700',
        'open-aapl',
        'close-aapl',
    ]);

});

