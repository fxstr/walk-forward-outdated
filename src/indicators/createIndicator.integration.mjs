import tulind from 'tulind';
import test from 'ava';
import createIndicator from './createIndicator';

test('throws on invalid arguments', async (t) => {
    const sma = tulind.indicators.sma;
    const SMA = createIndicator(sma);
    t.throws(() => new SMA('one', 'two'), /expected period/);
    t.notThrows(() => new SMA('one'));
    const validSma = new SMA(1);
    t.throws(() => validSma.next(1, 2), /expected:\s*real/); // Throws synchronously
    await t.notThrows(() => validSma.next(1));
});

test('returns expected results (for simple sma)', async (t) => {
    const SMA = createIndicator(tulind.indicators.sma);
    const sma = new SMA(3);
    t.deepEqual(await sma.next(3), undefined);
    t.deepEqual(await sma.next(4), undefined);
    t.deepEqual(await sma.next(8), 5);
    // Check order of history
    t.deepEqual(await sma.next(6), 6);
});

function makeStochMap(k, d) {
    return new Map([
        ['stoch_k', k],
        ['stoch_d', d],
    ]);
}

test('returns expected results (for multi-output stoch)', async (t) => {
    const Stoch = createIndicator(tulind.indicators.stoch);
    const stoch = new Stoch(3, 1, 2); // 3, 2, 3
    // Args are high, low, close
    // Same numbers as in indicators.integration.js
    t.deepEqual(await stoch.next(10, 6, 7), makeStochMap()); // makeStochMap returns 2xundefined
    t.deepEqual(await stoch.next(11, 8, 10), makeStochMap());
    t.deepEqual(await stoch.next(12, 8, 10), makeStochMap()); // f%k = 0.666
    t.deepEqual(await stoch.next(10, 8, 9), makeStochMap(25, 45.83333333333333)); // f%k = 0.25
    t.deepEqual(await stoch.next(13, 5, 8), makeStochMap(37.5, 31.25)); // f%k = 0.375
});

test('has a name and identifier', (t) => {
    const Stoch = createIndicator(tulind.indicators.stoch);
    //const stoch = new Stoch(5, 3, 1);
    //t.is(Stoch.name, 'Stochastic Oscillator');
    t.is(Stoch.identifier, 'stoch');
});