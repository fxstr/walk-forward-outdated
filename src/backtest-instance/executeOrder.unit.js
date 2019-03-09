import test from 'ava';
import executeOrder from './executeOrder';

function setupData() {
    // Make sure current price is the same for both positions and updated. Use one losing and one
    // winning position.
    // Current @10
    const shortPosition = {
        size: -10,
        value: 130,
        positions: [{
            size: -3,
            value: 18,
            openPrice: 8, // Short @8, now @10
        }, {
            size: -7,
            value: 112,
            openPrice: 13, // Short @13, now @10
        }],
    };

    // Current @10
    const longPosition = {
        size: 10,
        value: 100,
        positions: [{
            size: 3,
            value: 30,
            openPrice: 5, // Bought @5, now @10
        }, {
            size: 7,
            value: 70,
            openPrice: 12, // Bought @12, now @10
        }],
    };

    const empty = {
        size: 0,
        positions: [],
    };

    return {
        shortPosition,
        longPosition,
        empty,
        // Always use the current price to do orders; this price is reflected in the position's
        // value that is calculated just before execution and *must* correspond to the instrument's
        // price
        currentPrice: 10,
    };

}

test('executes in same direction (from short)', (t) => {
    const { shortPosition } = setupData();
    t.deepEqual(executeOrder(-5, shortPosition, 2, 10), {
        size: -15,
        value: 140,
        positions: [...shortPosition.positions, {
            size: -5,
            value: 10,
            openPrice: 2,
        }],
    });
});

test('executes in same direction (from long)', (t) => {
    const { longPosition, currentPrice } = setupData();
    t.deepEqual(executeOrder(5, longPosition, currentPrice), {
        size: 15,
        value: 150,
        positions: [...longPosition.positions, {
            size: 5,
            value: 50,
            openPrice: 10,
        }],
    });
});

// Only use up part of first position
test('executes in opposite direction (from short)', (t) => {
    const { shortPosition, currentPrice } = setupData();
    t.deepEqual(executeOrder(2, shortPosition, currentPrice), {
        size: -8,
        value: 118,
        positions: [
            {
                size: -1,
                value: 6, // shortened @8, now @10
                openPrice: 8, // unchanged
            },
            shortPosition.positions[1],
        ],
        closedPositions: [{
            size: -2,
            value: 12,
            openPrice: 8,
        }],
    });
});

// Use up first and part of second position
test('executes in opposite direction (from long)', (t) => {
    const { longPosition, currentPrice } = setupData();
    t.deepEqual(executeOrder(-5, longPosition, currentPrice), {
        size: 5,
        value: 50,
        positions: [{
            size: 5,
            value: 50,
            openPrice: 12,
        }],
        closedPositions: [{
            size: 3,
            value: 30,
            openPrice: 5,
        }, {
            size: 2,
            value: 20,
            openPrice: 12,
        }],
    });
});

test('execute in opposite direction and overshoot (from short)', (t) => {
    const { shortPosition, currentPrice } = setupData();
    t.deepEqual(executeOrder(12, shortPosition, currentPrice), {
        size: 2,
        value: 20,
        positions: [{
            size: 2,
            value: 20, // shortened @8, now @10
            openPrice: 10, // unchanged
        }],
        closedPositions: shortPosition.positions,
    });
});

test('execute in opposite direction and overshoot (from long)', (t) => {
    const { longPosition, currentPrice } = setupData();
    t.deepEqual(executeOrder(-12, longPosition, currentPrice), {
        size: -2,
        value: 20,
        positions: [{
            size: -2,
            value: 20,
            openPrice: 10,
        }],
        closedPositions: longPosition.positions,
    });
});


test('closes position', (t) => {
    const { longPosition, currentPrice } = setupData();
    t.deepEqual(executeOrder(-10, longPosition, currentPrice), {
        size: 0,
        positions: [],
        value: 0,
        closedPositions: longPosition.positions,
    });
});


test('works if position does not yet exist', (t) => {
    const { currentPrice } = setupData();
    t.deepEqual(executeOrder(-12, undefined, currentPrice), {
        size: -12,
        value: 120,
        positions: [{
            size: -12,
            value: 120,
            openPrice: 10,
        }],
    });
});

test('don\'t change existing positions', (t) => {
    const { longPosition, currentPrice } = setupData();
    const longPositionClone = JSON.parse(JSON.stringify(longPosition));
    executeOrder(-5, longPosition, currentPrice);
    t.deepEqual(longPosition, longPositionClone);
});

test('adds to (and does not remove) closed positions', (t) => {
    const { longPosition, currentPrice } = setupData();
    // Create order in opposite direction to get closedPosition; size is now -2
    const secondPosition = executeOrder(-12, longPosition, currentPrice);
    // Crate order in opposite direction again, size is now 2
    const thirdPosition = executeOrder(4, secondPosition, 7);
    t.deepEqual(
        thirdPosition.closedPositions,
        [
            { size: 3, value: 30, openPrice: 5 },
            { size: 7, value: 70, openPrice: 12 },
            { size: -2, value: 20, openPrice: 10 },
        ],
    );
});



