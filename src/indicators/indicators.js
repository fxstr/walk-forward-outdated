import SMA from './SMA';

/**
* Provices a central export for all indicators.
* We use tulip indicators because:
* - Performance is good (https://tulipindicators.org/benchmark)
* - node binding contains pre-compiled windows sources (in contrast to TA-LIB, see
*   https://github.com/oransel/node-talib)
*/
export { SMA };