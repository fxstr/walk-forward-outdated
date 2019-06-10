function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import path from 'path';
import fs from 'fs';
import logger from '../logger/logger';
import DataSeriesExporter from '../data-series-exporter/DataSeriesExporter';
import ViewableDataSeries from '../data-series/ViewableDataSeries';
import TransformableDataSeries from '../data-series/TransformableDataSeries';
import DataSeries from '../data-series/DataSeries';
import Instrument from '../instrument/Instrument';
import exportToCsv from '../export-to-csv/exportToCsv';
import HighChartsExporter from './HighChartsExporter';
const {
  debug
} = logger('WalkForward:BacktestExporter');
export default class BacktestExporter {
  constructor() {
    _defineProperty(this, "instrumentsSubDirectory", 'instruments');

    _defineProperty(this, "exportedAccounts", new Map());
  }

  /**
   * Exports data of a backtest
   * @param  {Map} instances          Key: parameter set, value: BacktestInstance
   * @param  {string} directory       Base path for export
   */
  async export(instances, directory) {
    if (!instances || !(instances instanceof Map)) {
      throw new Error(`BacktestExporter: instances must be a Map of BacktestInstances, is ${instances}.`);
    }

    if (!directory || typeof directory !== 'string') {
      throw new Error(`BacktestExporter: directory passed must be a string, is ${directory}.`);
    }

    this.instances = instances;
    const folderName = this.createBaseFolder(directory);
    this.directory = path.join(directory, `${folderName}`); // Create base directory

    await this.createDirectoryIfNotExists(this.directory);
    await this.exportInstances(); // Export an overview over all accounts; do this *after* we have exported single instance
    // because only now we will have accounts available

    await this.exportAllAccounts(this.directory);
    await this.exportAllPerformanceIndicators(instances, this.directory);
  }
  /**
   * Exports performance indicators for all instances in a table (to compare how parameterSets
   * performed), also exports parameter set itself
   * @param  {Map} instances              See constructor
   * @param  {string} directory
   */


  async exportAllPerformanceIndicators(instances, directory) {
    // Table contains:
    // First row: Number of run
    // Following rows: Optimized parameterr sets (1 row per parameter))
    // Following rows: Performance indicators
    // First col: Title of row
    // Subsequent cols: Data (col 1 per parameter set)
    const results = []; // First row: 'Row', then all the runs

    let currentRun = 0;
    const firstRow = ['Run'];

    while (currentRun < instances.size) {
      currentRun += 1; // Export performance indicator results
      // Re-format performance results; row 0: all names, row 1: all values

      firstRow.push(currentRun);
    }

    results.push(firstRow); // Add parameters as rows

    const params = [];
    let paramNames = [];

    for (const [paramSet] of instances) {
      // Careful: paramSet's key is undefined if no optimizations were made
      if (!paramSet) break;
      params.push(Array.from(paramSet.values())); // Update names: Only once and *only* if there are parameters available; if not, keep
      // the original empty array

      if (!paramNames.length) {
        paramNames = Array.from(paramSet.keys());
      }
    }

    paramNames.forEach((item, index) => {
      const row = [];
      row.push(item);

      for (const instanceParam of params) {
        row.push(instanceParam[index]);
      }

      results.push(row);
    }); // Add performance indicators (every indicator becomes a row)

    const firstInstance = instances.size ? Array.from(instances.values())[0] : undefined; // Only add performance results if we have instances

    if (firstInstance) {
      // Array with name of all performance indicators
      const performanceIndicatorNames = Array.from(firstInstance.performanceResults.keys()); // Create a new row for every performance result

      for (const performanceIndicatorName of performanceIndicatorNames) {
        const row = [performanceIndicatorName]; // Add a col with the performance result of every instance

        for (const [, instance] of instances) {
          row.push(instance.performanceResults.get(performanceIndicatorName));
        }

        results.push(row);
      }
    }

    await exportToCsv(path.join(directory, 'performances.csv'), results);
  }
  /**
   * Creates a new directory in which we store our data
   * @returns {String} Folder's name (counts up)
   */


  createBaseFolder(directory) {
    // Store everything in a subfolder that counts upwards; don't use current date as it's
    // difficult to test.
    const folderContent = fs.readdirSync(directory);
    let folderName = 1; // Walk through files/folders; if name is a valid int, set folderName to next higher int

    folderContent.forEach(content => {
      const parsed = parseInt(content, 10);
      if (!Number.isNaN(parsed)) folderName = parsed + 1;
    });
    return folderName;
  }
  /**
   * Exports instances (all test runs)
   * @private
   */


  async exportInstances() {
    let index = 0;

    for (const [params, instance] of this.instances) {
      await this.exportInstance(++index, instance, params);
    }
  }

  async exportAllAccounts(basePath) {
    // Convert accounts data to an array with
    // [
    //     new Map([[runNumber: value], [runNumber: value]]),
    //     new Map([[runNumber: value], [runNumber: value]]),
    // ]
    const allAccountsData = [];

    for (const [runNumber, currentAccount] of this.exportedAccounts) {
      // Go throught data for every account, add to allAccountsData
      currentAccount.data.forEach((item, index) => {
        // Add new row (with date)
        if (!allAccountsData[index]) {
          allAccountsData[index] = new Map([['date', item.get('date')]]);
        }

        allAccountsData[index].set(runNumber, item.get('total'));
      });
    } // Convert to DataSeries


    const allAccounts = new ViewableDataSeries();

    for (const date of allAccountsData) {
      await allAccounts.add(date);
    }

    const exporter = new DataSeriesExporter();
    await exporter.export(allAccounts, path.join(basePath, 'accounts'));
    const chartExporter = new HighChartsExporter();
    await chartExporter.export(allAccounts, basePath, 'accounts');
  }
  /**
   * Exports a signle instance (one test run with a given set of params)
   * @param {number} number               Index of current instance, needed for naming
   * @param  {BacktestInstance} instance
   * @private
   */


  async exportInstance(number, instance) {
    const instancePath = path.join(this.directory, `run-${number}`);
    await this.createDirectoryIfNotExists(instancePath);
    const accountData = await this.exportAccount(instance.accounts.data, instancePath); // Update exportedAccounts with current account data; needed to put together a view of all
    // accounts

    this.exportedAccounts.set(number, accountData);
    await this.exportInstancePositions(instance.positions, instancePath); // Export instruments; instance.instruments is an instance of BacktestInstruments; to
    // access the instruments, we have to call its instruments property.

    for (const [, instrument] of instance.instruments.instruments) {
      await this.exportInstrument(instrument, instancePath, instance.positions);
    }
  }
  /**
   * Export positions for a backtest instance
   * @param  {DataSeries} positions          Positions of an instance
   * @param  {String} instancePath           Path to store data in
   */


  async exportInstancePositions(positions, instancePath) {
    // Export positions: They contain objects; just take the size of every instrument instead
    // of the whole object (that would be stringified to [object Object]).
    const cleanPositions = new DataSeries();

    for (const row of positions.data) {
      // Only export positions on close
      if (row.get('type') === 'open') continue;
      const rowMap = new Map(); // Map through all columns (and not only the columns of a ctertain row) to set size to
      // 0 (instead of undefined/empty) if no position existed

      for (const [columnKey] of positions.columns) {
        // key is either 'type', 'date' or an instrument; if it's instrument, value is an
        // object with all positions and the final size. Only use this size.
        if (columnKey instanceof Instrument) {
          const size = row.has(columnKey) ? row.get(columnKey).size : 0;
          rowMap.set(columnKey.name, size);
        } else if (columnKey === 'date') {
          rowMap.set(columnKey, row.get(columnKey));
        } // Ignore column 'type'

      }

      await cleanPositions.add(rowMap);
    }

    const exporter = new DataSeriesExporter();
    await exporter.export(cleanPositions, path.join(instancePath, 'positions'));
  }
  /**
   * Exports account consisting of invested, cash, total
   * @param  {Array} accountData          Data property of DataSeries
   * @param  {String} instancePath
   * @returns {TransformableDataSeries}   Account data with all acount types added up
   */


  async exportAccount(accountData, instancePath) {
    // Transformer that adds up invested and cash, adds column 'total'
    class AccountTotalTransformer {
      next(...data) {
        return data.reduce((prev, item) => prev + item, 0);
      }

    }

    const accountsWithTotal = new TransformableDataSeries();
    accountsWithTotal.addTransformer(['invested', 'cash'], new AccountTotalTransformer(), 'total');

    for (const col of accountData) {
      await accountsWithTotal.add(col);
    }

    const exporter = new DataSeriesExporter();
    await exporter.export(accountsWithTotal, path.join(instancePath, 'accounts'));
    return accountsWithTotal;
  }
  /**
   * Exports a single instrument's data (that belongs to a certain instance).
   * @param  {Instrument} instrument
   * @param  {string} basePath         Path to export file to; file name is instrument's name.
   * @param {DataSeries} positions     Positions (will be added to instrument in a separate
   *                                   chart)
   * @private
   */


  async exportInstrument(instrument, basePath, positions) {
    const instrumentPath = path.join(basePath, this.instrumentsSubDirectory); // Create new ViewableDataSeries for instrument; clone everything and add positions
    // console.log('instrumentis', instrument);

    const instrumentClone = new Instrument(instrument.name);
    instrumentClone.viewConfig = instrument.viewConfig; // Adds the position for a certain date to the instrument; using a transformer prevents us
    // from editing

    class PositionTransformer {
      next(date) {
        // Get correct row of positions to match current date
        const position = positions.data.find(positionRow => positionRow.get('type') === 'close' && positionRow.get('date').getTime() === date.getTime());
        const instrumentPosition = position && position.get(instrument);
        return instrumentPosition ? instrumentPosition.size : 0;
      }

      getChartConfig() {
        return {
          chart: {
            height: 0.3,
            title: {
              text: 'Positions'
            }
          },
          series: {
            name: 'Positions',
            type: 'area'
          }
        };
      }

    }

    instrumentClone.addTransformer(['date'], new PositionTransformer(), 'Position Size'); // Move data from instrument to instrumentClone

    for (const row of instrument.data) {
      await instrumentClone.add(new Map(row));
    } // console.debug('instrument is %o', instrument.viewConfig);
    // console.debug('instrumentClone is %o', instrumentClone.viewConfig);


    await this.createDirectoryIfNotExists(instrumentPath); // CSV export

    const destination = path.join(instrumentPath, instrumentClone.name);
    const exporter = new DataSeriesExporter();
    debug('Export instrument %s to %s', instrumentClone.name, destination);
    await exporter.export(instrumentClone, destination); // Highstock export

    const chartExporter = new HighChartsExporter(); // console.log('instrumentClone', instrument);

    await chartExporter.export(instrumentClone, instrumentPath);
  }
  /**
   * Creates a directory if it does not exist
   * @param  {string} path        Path to directory that shall be created
   * @private
   */


  createDirectoryIfNotExists(directoryPath) {
    return new Promise((resolve, reject) => {
      fs.access(directoryPath, fs.constants.F_OK, err => {
        // No error thrown, directory exists
        if (!err) return resolve();
        debug('Create directory %s', directoryPath);
        fs.mkdir(directoryPath, mkdirErr => mkdirErr ? reject(mkdirErr) : resolve());
      });
    });
  }

}
//# sourceMappingURL=BacktestExporter.mjs.map