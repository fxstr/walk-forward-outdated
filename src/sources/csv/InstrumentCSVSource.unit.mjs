import test from 'ava';
import path from 'path';
import InstrumentCSVSource from './InstrumentCSVSource';

// If we use .mjs, __dirname is not available
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function setupData() {
    function instrumentNameFunction(name) {
        // Get file name, use it as instrument name
        return name.match(/.*\/([^/]*)\.csv$/)[1];
    }
    return { instrumentNameFunction };
}

test('throws correct errors on init', (t) => {
    t.throws(() => new InstrumentCSVSource(), /First argument/);
});

test('throws errors on read', async(t) => {
    // Invalid return value of file name function
    const { instrumentNameFunction } = setupData();
    const csv1 = new InstrumentCSVSource(
        () => false,
        [path.join(__dirname, 'backtest*/*.csv')],
    );
    await t.throwsAsync(() => csv1.read(), /Instrument not provided/);
    // Date missing in CSV
    const csv2 = new InstrumentCSVSource(
        instrumentNameFunction,
        [path.join(__dirname, 'backtest*/no-date.csv')],
    );
    await t.throwsAsync(() => csv2.read(), /date field/);
});


test('reads files', async(t) => {
    const { instrumentNameFunction } = setupData();
    const csv = new InstrumentCSVSource(
        instrumentNameFunction,
        [path.join(__dirname, 'backtest*/t*.csv')],
    );
    const result = await csv.read();
    t.is(result.length, 8);
    // 4 rows in test1
    const firstItem = result[0];
    t.deepEqual(firstItem.get('date'), new Date('2018-01-02'));
    t.is(firstItem.get('instrument'), 'test1');
    t.is(firstItem.get('open'), 3);
    t.is(firstItem.get('high'), 6);
    t.is(firstItem.get('low'), 2);
    t.is(firstItem.get('close'), 5);
});
