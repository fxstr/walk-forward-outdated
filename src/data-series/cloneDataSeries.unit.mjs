import test from 'ava';
import cloneDataSeries from './cloneDataSeries';
import DataSeries from './DataSeries';

function setupData() {
    const dataSeries = new DataSeries();
    dataSeries.add(new Map([['a', 1], ['b', 2]]));
    dataSeries.add(new Map([['a', 2], ['b', 0]]));
    return { dataSeries };
}

test('clones data series', (t) => {
    const { dataSeries } = setupData();
    const clone = cloneDataSeries(DataSeries, dataSeries);
    t.deepEqual(clone.data, dataSeries.data);
});

test('applies transformer', (t) => {
    const { dataSeries } = setupData();
    const clone = cloneDataSeries(DataSeries, dataSeries, (col, row, cell) => cell + 1);
    t.is(clone.data.length, 2);
    t.deepEqual(clone.data[0], new Map([['a', 2], ['b', 3]]));
    t.deepEqual(clone.data[1], new Map([['a', 3], ['b', 1]]));
});

test('calls transformer with correct params', (t) => {
    const { dataSeries } = setupData();
    const allArgs = [];
    cloneDataSeries(DataSeries, dataSeries, (...args) => allArgs.push(args));
    t.is(allArgs.length, 4);
    // Column
    t.is(allArgs[0][0], 'a');
    // Row
    t.deepEqual(allArgs[0][1], dataSeries.data[0]);
    // Cell
    t.deepEqual(allArgs[0][2], 1);
});

test('transforms column keys', (t) => {
    const { dataSeries } = setupData();
    const clone = cloneDataSeries(DataSeries, dataSeries, (col, row, cell) => {
        if (col === 'b') return cell + 1;
        return cell;
    }, (colKey) => colKey === 'b' ? 'c' : 'a');
    t.is(clone.data.length, 2);
    t.deepEqual(clone.data[0], new Map([['a', 1], ['c', 3]]));
    t.deepEqual(clone.data[1], new Map([['a', 2], ['c', 1]]));

});