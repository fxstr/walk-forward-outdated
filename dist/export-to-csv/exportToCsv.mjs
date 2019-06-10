import csv from 'fast-csv';
import logger from '../logger/logger';
const {
  debug
} = logger('WalkForward:exportToCsv');
/**
 * Wraps writeToPath into a promise
 * @param  {string} path        Path to write file to
 * @param  {Array} dataAsArray  Data to write to CSV
 * @return {Promise}
 */

export default function (path, dataAsArray) {
  return new Promise((resolve, reject) => {
    csv.writeToPath(path, dataAsArray, {
      transform: row => {
        // Transform dates to ISO string; default JS toString is hardly parsable
        return row.map(field => field instanceof Date ? field.toISOString() : field);
      }
    }).on('finish', () => {
      debug('Data stored to %s', path);
      resolve();
    }).on('error', err => {
      debug('Data could not be stored, %o', err);
      reject(new Error(err));
    });
  });
}
//# sourceMappingURL=exportToCsv.mjs.map