import test from 'ava';
import performanceIndicators from './performanceIndicators.mjs';

test('exports indicators', (t) => {
    const indicators = ['ProfitFactor', 'Cagr'];
    indicators.forEach((name) => {
        t.is(typeof performanceIndicators[name], 'function');
    });
});
