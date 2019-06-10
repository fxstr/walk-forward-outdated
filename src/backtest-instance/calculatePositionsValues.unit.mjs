import test from 'ava';
import calculatePositionsValues from './calculatePositionsValues';

function setupData() {
    const instruments = [{ name: 'aapl' }, { name: 'amzn' }];
    const prices = new Map([[instruments[0], 5], [instruments[1], 10]]);
    // Current prices (before update): aapl @3, amzn @6
    const positions = new Map([[instruments[0], {
        size: 5,
        value: 21,
        positions: [{
            size: 2,
            openPrice: 2,
            value: 12,
        }, {
            size: 3,
            openPrice: 6,
            value: 9,
        }],
    }], [instruments[1], {
        size: -4,
        value: 32,
        positions: [{
            size: -4,
            openPrice: 7,
            value: 32,
        }],
    }]]);
    return { instruments, prices, positions };
}

test('updates values correctly', (t) => {
    const { prices, positions, instruments } = setupData();
    const result = calculatePositionsValues(positions, prices);
    // Now: aapl@5, amzn@10
    t.deepEqual(result, new Map([[instruments[0], {
        size: 5,
        value: 25,
        positions: [{
            size: 2,
            openPrice: 2,
            value: 10,
        }, {
            size: 3,
            openPrice: 6,
            value: 15,
        }],
    }], [instruments[1], {
        size: -4,
        value: 16,
        positions: [{
            size: -4,
            openPrice: 7,
            value: 16,
        }],
    }]]));
});


test('handles empty prices (unchanged position)', (t) => {
    const { positions } = setupData();
    const result = calculatePositionsValues(positions, new Map());
    t.deepEqual(result, setupData().positions);
});

test('handles empty positions', (t) => {
    const { prices } = setupData();
    const result = calculatePositionsValues(new Map(), prices);
    t.deepEqual(result, new Map());
});


test('does not change original data', (t) => {
    const { prices, positions, instruments } = setupData();
    calculatePositionsValues(positions, prices);
    t.deepEqual(prices, setupData().prices);
    t.deepEqual(instruments, setupData().instruments);
    t.deepEqual(positions, setupData().positions);
});

test('does not change closedPositions', (t) => {
    const { prices, positions, instruments } = setupData();
    const closed = [{ size: 3, value: 15, openPrice: 3 }];
    positions.get(instruments[0]).closedPositions = closed;
    console.log(positions.get(instruments[0]));
    const result = calculatePositionsValues(positions, prices);
    t.is(result.get(instruments[0]).closedPositions, closed);
});


