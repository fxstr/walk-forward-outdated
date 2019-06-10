import test from 'ava';
import checkInstrumentData from './checkInstrumentData.js';

test('throws on invalid data', (t) => {
    t.throws(() => checkInstrumentData({}), /be a Map/);

    t.throws(
        () => checkInstrumentData(new Map()),
        /valid date field/,
    );
    t.throws(
        () => checkInstrumentData(new Map([['date', 5]])),
        /valid date field/,
    );

    t.throws(
        () => checkInstrumentData(new Map([['date', new Date()]])),
        /valid close field/,
    );
    t.throws(
        () => checkInstrumentData(new Map([['date', new Date()], ['close', '3']])),
        /valid close field/,
    );

    t.throws(
        () => checkInstrumentData(new Map([['date', new Date()], ['close', 3]])),
        /valid open field/,
    );
    t.throws(
        () => checkInstrumentData(new Map([['date', new Date()], ['close', 3], ['open', '2']])),
        /valid open field/,
    );

    t.throws(
        () => checkInstrumentData(new Map([['date', new Date()], ['close', 3], ['open', 2]])),
        /valid instrument field/,
    );
    t.throws(
        () => checkInstrumentData(new Map([
            ['date', new Date()],
            ['close', 3],
            ['open', 2],
            ['instrument', 3]])),
        /valid instrument field/,
    );

    t.notThrows(() => checkInstrumentData(new Map([
        ['date', new Date()],
        ['close', 3],
        ['open', 2],
        ['instrument', 'aapl'],
    ])));

});
