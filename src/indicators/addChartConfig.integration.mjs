import test from 'ava';
import tulind from 'tulind';
import createIndicator from './createIndicator';
import addChartConfig from './addChartConfig';

test('extends stoch with chart config', (t) => {
    const Stoch = createIndicator(tulind.indicators.stoch);
    const StochWithConfig = addChartConfig(Stoch);
    const stoch = new StochWithConfig(2, 3, 4);
    // We cannot compare result with getChartConfig's original data as it contains Symbols
    t.is(stoch.getChartConfig().chart.name, 'Stochastic Oscillator');
    // Extends existing class
    t.is(stoch instanceof Stoch, true);
});

test('does not extend sma', (t) => {
    const Sma = createIndicator(tulind.indicators.sma);
    const SmaWithConfig = addChartConfig(Sma);
    const stoch = new SmaWithConfig(2);
    t.deepEqual(stoch.getChartConfig(), undefined);
});