import csv from 'fast-csv';
import debug from 'debug';

const log = debug('WalkForward:exportToCsv');

/**
 * Wraps writeToPath into a promise
 * @param  {string} path        Path to write file to
 * @param  {Array} dataAsArray  Data to write to CSV
 * @return {Promise}
 */
export default function(path, dataAsArray) {

    return new Promise((resolve, reject) => {
        csv
            .writeToPath(path, dataAsArray)
            .on('finish', () => {
                log('Data stored to %s', path);
                resolve();
            })
            .on('error', (err) => {
                log('Data could not be stored, %o', err);
                reject(new Error(err));
            });
    });

}
