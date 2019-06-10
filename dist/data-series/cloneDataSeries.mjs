/**
 * Clones and transforms a data series (see DataSeries.from)
 * @πaram {Object} DataSeries               Original DataSeries class; if we import it here, we have
 *                                          a circular import (import cloneDataSeries in DataSeries
 *                                          and import DataSeries in cloneDataSeries) which will
 *                                          lead to a different «instance» of DataSeries here.
 *                                          instanceof won't work any more.
 * @param {DataSeries} dataSeries
 * @param {function} transformer            Function that takes 3 arguments: column, row, cell and
 *                                          returns new cell value
 * @param {function} columnKeyTransformer   Function to transform column key; takes a single
 *                                          argument (current key)
 * @return {DataSeries}
 */
export default function cloneDataSeries(DataSeries, source, transformer, columnKeyTransformer) {
  const dataSeries = new DataSeries();

  for (const row of source.data) {
    const transformedRow = new Map();

    for (const [column, content] of row) {
      const newColumnKey = columnKeyTransformer ? columnKeyTransformer(column) : column;
      if (transformer) transformedRow.set(newColumnKey, transformer(column, row, content));else transformedRow.set(newColumnKey, content);
    }

    dataSeries.add(transformedRow);
  }

  return dataSeries;
}
//# sourceMappingURL=cloneDataSeries.mjs.map