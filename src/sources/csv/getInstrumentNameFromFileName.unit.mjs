import test from 'ava';
import getInstrumentNameFromFileName from './getInstrumentNameFromFileName';

test('converts file names', (t) => {
    t.is(getInstrumentNameFromFileName('AAPL.csv'), 'aapl');
    t.is(getInstrumentNameFromFileName('AAPL'), 'aapl');
    // Dot in file name
    t.is(getInstrumentNameFromFileName('AAPL.new.csv'), 'aapl.new');
    // Path
    t.is(getInstrumentNameFromFileName('/path/to/AAPL.csv'), 'aapl');
});
