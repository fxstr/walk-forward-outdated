import ViewableDataSeries from '../data-series/ViewableDataSeries.mjs';
/**
* Represents any tradable/backtestable instrument
*/

export default class Instrument extends ViewableDataSeries {
  /* ohlcChartConfig = {
      type: 'ohlc',
  } */

  /**
   * TODO: Check if all required fields (OHLC + date) are available – if they're not we'll run
   * into problems later
   */

  /* add(data) {
      // Check object and Map
      super.add(data);
  } */

  /* addColumns(data) {
      super.addColumns(data);
      for (const [columnName] of data) {
          if (this.viewConfig.chart.has(columnName)) continue;
          this.viewConfig.chart.set(columnName)
      }
  } */

  /**
  * @param {string} name
  */
  constructor(name) {
    super();

    if (!name || typeof name !== 'string') {
      throw new Error(`Instrument: Pass the name (string) as first argument to constructor, is ${name}.`);
    }

    this.name = name;
  }

}
//# sourceMappingURL=Instrument.mjs.map