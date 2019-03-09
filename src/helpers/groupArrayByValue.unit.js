import test from 'ava';
import groupArrayByValue from './groupArrayByValue';

test('initializes correctly', (t) => {
    t.throws(() => groupArrayByValue(), /not an array/);
    t.throws(() => groupArrayByValue([]), /not a function/);
    t.notThrows(() => groupArrayByValue([], () => {}));
});

test('groups correctly', (t) => {
    const originalData = [
        { key: 1, value: 1},
        { key: 2, value: 2},
        { key: 1, value: 3},
        { key: 3, value: 4},
        { key: 2, value: 5},
    ];
    const grouped = groupArrayByValue(originalData, (item) => item.key);
    t.deepEqual(grouped, new Map([
        [1, [originalData[0], originalData[2]]],
        [2, [originalData[1], originalData[4]]],
        [3, [originalData[3]]],
    ]));
});
