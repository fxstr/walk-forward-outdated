import test from 'ava';
import executeOrders from './executeOrders';

function setupData() {
    const instruments = [{
        name: 'aapl',
    }, {
        name: 'amzn',
    }];
    const prices = new Map([[instruments[0], 3], [instruments[1], 10]]);
    const positions = new Map();
    positions.set(instruments[0], {
        size: 4,
        value: 12,
        positions: [{
            size: 4,
            value: 12, // Bought @2, now @3 – must correspond to prices!
            openPrice: 2,
        }],
    });
    return { instruments, prices, positions };
}

test('does not order if there\'s no data for an instrument (position exsists)', (t) => {
    const { positions, instruments } = setupData();
    const result = executeOrders(
        positions,
        new Map([[instruments[0], { size: 10 }]]),
        new Map(),
        100,
    );
    const originalPositions = setupData().positions;
    t.deepEqual(result, originalPositions);
});

test('does not order if there\'s no data for an instrument (position doesn\'t exsist)', (t) => {
    const { positions, prices } = setupData();
    const originalPositions = setupData().positions;
    const result = executeOrders(
        positions,
        new Map([[{ name: 'no' }, { size: 10 }]]),
        prices,
        100,
    );
    t.deepEqual(result, originalPositions);
});

test('does not execute if cash is tight', (t) => {
    const { positions, prices, instruments } = setupData();
    const result = executeOrders(
        positions,
        // Current price of instrument 1 is 3, cost ist 2*3 = 6, only 5 available – should not
        // be executed
        new Map([
            [instruments[0], { size: 2 }],
        ]),
        prices,
        5,
    );
    t.is(result.get(instruments[0]).size, 4);
});


test('frees money first, then spends it', (t) => {
    const { positions, prices, instruments } = setupData();
    const result = executeOrders(
        positions,
        // Second order frees money (changes from current 4@3 to -2@3, frees 2*3 = 6), should
        // be executed first. Only then we have enough money to execute first order.
        new Map([
            [instruments[1], { size: 1 }],
            [instruments[0], { size: -6 }],
        ]),
        prices,
        // 6 is freed by second order; cost of first order is 10, we need 4 cash
        4,
    );
    t.is(result.get(instruments[0]).size, -2);
    t.is(result.get(instruments[0]).value, 6);
    // t.is(result.get(instruments[1]).size, 1);
    // t.is(result.get(instruments[1]).value, 10);
});


// Makes sure only *net* change is used when looking at cost of a trade
test('if switching from long to short, current money of position is available for order', (t) => {
    const { positions, prices, instruments } = setupData();
    // Use exact same price as we had when the position was opened
    const result = executeOrders(
        positions,
        new Map([
            [instruments[0], { size: -9 }],
        ]),
        prices,
        // Current price is 3. We sell 4@3, will have 12 cash. Then we sell short 5@3, makes 15.
        // Therefore we need additional cash of 3. Cash left will be 0
        3,
    );
    t.is(result.get(instruments[0]).size, -5);
});


test('does not change original data', (t) => {
    const { positions, prices, instruments } = setupData();
    const orders = new Map([
        [instruments[1], { size: 10 }],
        [instruments[0], { size: 10 }],
    ]);
    // See http://2ality.com/2015/08/es6-map-json.html for JSONification of a Map
    const originalOrders = new Map(JSON.parse(JSON.stringify([...orders])));
    executeOrders(positions, orders, prices, 50);
    t.deepEqual(orders, originalOrders);
    t.deepEqual(positions, setupData().positions);
    t.deepEqual(prices, setupData().prices);
    t.deepEqual(instruments, setupData().instruments);
});


