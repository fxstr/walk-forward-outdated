/**
 * Takes an array, groups it by a certain value of its items and returns the grouped Map
 * @param  {array} data                 Data to group
 * @param  {[type]} groupValueFunction  Function that takes an item of data as an argument and
 *                                      returns the key to group by, e.g. (item) => item.key
 * @return {Map}                        Map with grouping value as a key and an array of the
 *                                      values for that key as an array
 */
export default function groupArrayByValue(data, groupValueFunction) {
  if (!Array.isArray(data)) {
    throw new Error(`groupArrayByValue: data passed in is not an array.`);
  }

  if (typeof groupValueFunction !== 'function') {
    throw new Error(`groupArrayByValue: groupValueFunction passed in is not a function.`);
  }

  const groupedData = new Map();

  for (const entry of data) {
    const value = groupValueFunction(entry);
    if (groupedData.has(value)) groupedData.get(value).push(entry);else groupedData.set(value, [entry]);
  }

  return groupedData;
}
//# sourceMappingURL=groupArrayByValue.mjs.map