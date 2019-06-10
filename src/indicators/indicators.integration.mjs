// Test integration of indicators with TransformableDataSeries
import test from 'ava';
import indicators from './indicators';
import TransformableDataSeries from '../data-series/TransformableDataSeries';

const { Sma, Stoch } = indicators;

test('handles single values', async (t) => {
    const ds = new TransformableDataSeries();
    const key = Symbol();
    ds.addTransformer(['close'], new Sma(4), key);
    // If we emit await, all set method calls from transformer will be called on last
    // element which will fail.
    await ds.add(new Map([['close', 3]]));
    await ds.add(new Map([['close', 2]]));
    await ds.add(new Map([['close', 5]]));
    await ds.add(new Map([['close', 2]]));
    t.is(ds.head().get(key), 3);
});


test('handles multiple values', async (t) => {
    const ds = new TransformableDataSeries();
    const keys = {
        'stoch_k': Symbol(),
        'stoch_d': Symbol(),
    };
    ds.addTransformer(['high', 'low', 'close'], new Stoch(3, 1, 2), keys);
    // Same numbers as in createIndicator.integration.js
    await ds.add(new Map([['high', 10], ['low', 6], ['close', 7]]));
    await ds.add(new Map([['high', 11], ['low', 8], ['close', 10]]));
    await ds.add(new Map([['high', 12], ['low', 8], ['close', 10]]));
    await ds.add(new Map([['high', 10], ['low', 8], ['close', 9]]));
    t.is(ds.head().get(keys['stoch_k']), 25);
    t.is(ds.head().get(keys['stoch_d']), 45.83333333333333);
});