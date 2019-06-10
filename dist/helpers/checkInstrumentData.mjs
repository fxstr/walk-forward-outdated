/**
 * Checks if all required fields are available on the interval data for an instrument
 * @param {Map[]} data    Data to check, is an array of Maps with open, close, date, instrument …
 * @throws
 */
export default function checkInstrumentData(data) {
  if (!(data instanceof Map)) {
    throw new Error(`checkInstrumentData: Every data set returned by generator function must be a Map, is ${data}.`);
  } else if (!data.has('date') || !(data.get('date') instanceof Date)) {
    throw new Error(`checkInstrumentData: Every data set returned by generator function must contain a valid date field that is a Date, is ${data.get('date')}.`);
  } else if (!data.has('close') || typeof data.get('close') !== 'number') {
    throw new Error(`checkInstrumentData: Every data set returned by generator function must contain a valid close field that is a number, is ${data.get('close')}`);
  } // Open field is needed to execute orders on the beginning of the the next interval with the
  // actual open price
  else if (!data.has('open') || typeof data.get('open') !== 'number') {
      throw new Error(`checkInstrumentData: Every data set returned by generator function must contain a valid open field that is a number, is ${data.get('open')}`);
    } else if (!data.has('instrument') || typeof data.get('instrument') !== 'string') {
      throw new Error(`checkInstrumentData: Every data set returned by generator function must contain a valid instrument field that is a string, is ${data.get('instrument')}`);
    }
}
//# sourceMappingURL=checkInstrumentData.mjs.map