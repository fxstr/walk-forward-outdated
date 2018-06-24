import test from 'ava';
import * as performanceIndicators from './performanceIndicators';

test('exports indicators', (t) => {
    const indicators = ['ProfitFactor', 'Cagr'];
    indicators.forEach((name) => {
        t.is(typeof performanceIndicators[name], 'function');
    });
});
