/**
 * Sort function for data that will be passed to DataGenerator; sorts all data chronologically.
 * @param  {Map} a
 * @param  {Map} b
 */
export default function (a, b) {
  if (!a.get('date') || !b.get('date')) {
    throw new Error('dataSortFunction: date property not available on entries.');
  }

  if (!(a.get('date') instanceof Date) || !(b.get('date') instanceof Date)) {
    throw new Error(`dataSortFunction: date property must be an instance of Date, is ${a.get('date')} and ${b.get('date')}.`);
  } // Sort by date first (youngest on top), then by index (when returning 0):
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort


  return a.get('date').getTime() - b.get('date').getTime();
}
//# sourceMappingURL=dataSortFunction.mjs.map