import path from 'path';
import test from 'ava';
import CSVSource from './CSVSource';

test('gets and generates data', async(t) => {
    const source = new CSVSource(path.join(__dirname, 'backtest-test-data/test*'));
    const rows = [];
    for await (const row of source.generate()) {
        rows.push(row);
    }
    // One entry per *date* (not per row)
    t.is(rows.length, 6);
    // 2018-01-04,2,4,1,3 is emitted as array with just one entry for the latest date
    t.deepEqual(rows[5], [new Map([
        ['instrument', 'test1'],
        ['date', new Date('2018-01-06')],
        ['open', 2],
        ['high', 4],
        ['low', 1],
        ['close', 3],
    ])]);
});
