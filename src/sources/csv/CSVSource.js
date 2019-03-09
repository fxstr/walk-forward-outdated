import InstrumentCSVSource from './InstrumentCSVSource';
import BacktestCSVSource from './BacktestCSVSource';
import getInstrumentNameFromFileName from './getInstrumentNameFromFileName';

/**
 * Backtest specific CSV source that is exported. Basically merges InstrumentCSVSource and
 * BacktestCSVSource that were separated for easier testing.
 */
export default class CSVSource {
    constructor(pathSpecs) {
        const instrumentCSVSource = new InstrumentCSVSource(
            getInstrumentNameFromFileName,
            pathSpecs,
        );
        this.backtestCSVSource = new BacktestCSVSource(instrumentCSVSource);
    }

    generate() {
        return this.backtestCSVSource.generate();
    }

}
