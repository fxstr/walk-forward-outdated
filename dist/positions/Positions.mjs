import DataSeries from '../data-series/DataSeries';
import Instrument from '../instrument/Instrument';
/**
 * Wrapper around TransformableDataSeries with some utilities that are only required by
 * positions.
 * Positions is a DataSeries where each entry has the following fields:
 * - date
 * - type (open/close)
 * - instrument with position details
 */

export default class Positions extends DataSeries {
  /**
   * Returns all position fields of head, i.e. all Map entries that do have an Instrument as a
   * key
   * @return {Map} - Map with Instrument as a key and position information as value
   */
  getPositions(entry) {
    const positionsOnly = new Map(); // If DataSeries has no entries, return empty Map

    if (!entry) return positionsOnly;

    for (const [key, positionInformation] of entry) {
      // Don't return or add keys for date and type
      if (key instanceof Instrument) {
        positionsOnly.set(key, positionInformation);
      }
    }

    return positionsOnly;
  }

}
//# sourceMappingURL=Positions.mjs.map