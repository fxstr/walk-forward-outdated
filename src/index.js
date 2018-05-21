import Backtest from './backtest/Backtest';
import BacktestCSVSource from './sources/csv/BacktestCSVSource';
import Algorithm from './algorithm/Algorithm';
import { runThrough, rejectOnFalse } from './runners/runners.js';
import { SMA } from './indicators/indicators.js';

const indicators = { SMA };

export { BacktestCSVSource, runThrough, rejectOnFalse, indicators, Algorithm };
export default Backtest;
