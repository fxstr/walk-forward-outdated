import test from 'ava';
import dataSortFunction from './dataSortFunction';

test('throws on invalid data', (t) => {
    t.throws(() => dataSortFunction([{}, {}], /date property/));
    t.throws(() => dataSortFunction([{ date: 1 }, { date: false }], /instance of Date/));
});

test('sorts chronologically', (t) => {
    const data = [new Map([
        ['date', new Date(2017, 1, 4)],
        ['order', 3],
    ]), new Map([
        ['date', new Date(2017, 0, 3)],
        ['order', 0],
    ]), new Map([
        ['date', new Date(2017, 1, 1)],
        ['order', 2],
    ]),
    // Same date as above, sort by index
    new Map([
        ['date', new Date(2017, 0, 3)],
        ['order', 1],
    ])];
    data.sort(dataSortFunction);
    t.deepEqual(data.map(item => item.get('order')), [0, 1, 2, 3]);
});
