import path from 'path';
import fs from 'fs';
import debug from 'debug';
import DataSeriesExporter from '../data-series-exporter/DataSeriesExporter';
import DataSeries from '../data-series/DataSeries';
import Instrument from '../instrument/Instrument';
import exportToCsv from '../export-to-csv/exportToCsv';
import HighChartsExporter from './HighChartsExporter';
const log = debug('WalkForward:BacktestExporter');


export default class BacktestExporter {


    async export(instances, directory) {
        if (!instances || !(instances instanceof Map)) {
            throw new Error(`BacktestExporter: instances must be a Map of BacktestInstances, is
                ${ instances }.`);
        }
        if (!directory || typeof directory !== 'string') {
            throw new Error(`BacktestExporter: directory passed must be a string, is 
                ${ directory }.`);
        }
        this.instances = instances;

        // Store everything in a subfolder that counts upwards; don't use current date as it's 
        // difficult to test.
        const folderContent = fs.readdirSync(directory);
        let folderName = 1;
        // Walk through files/folders; if name is a valid int, set folderName to next higher int
        folderContent.forEach((content) => {
            const parsed = parseInt(content, 10);
            if (!isNaN(parsed)) folderName = parsed + 1;
        });
        this.directory = path.join(directory, folderName + '');
        // Create base directory
        await this.createDirectory(this.directory);
        await this.exportInstances();
    }


    /**
     * Exports instances
     * @private
     */
    async exportInstances() {
        let index = 0;
        for (const [params, instance] of this.instances) {
            await this.exportInstance(++index, instance, params);
        }
    }


    /**
     * Exports a signle instance
     * @param {number} number               Index of current instance
     * @param  {BacktestInstance} instance 
     * @private
     */
    async exportInstance(number, instance) {
        const instancePath = path.join(this.directory, `run-${ number }`);
        await this.createDirectory(instancePath);

        // Export account
        const exporter = new DataSeriesExporter();
        await exporter.export(instance.accounts, path.join(instancePath, 'accounts.csv'));

        // Export positions: They contain objects; just take the size of every instrument instead 
        // of the whole object (that would be stringified to [object Object]).
        const convertedPositions = DataSeries.from(instance.positions, (col, row, cell) => {
                // For cols type and date: return their actual value
                if (!(col instanceof Instrument)) return cell;
                return cell.size || 0;
            }, 
            // Use instrument name as instrument's col head
            (columnKey) => columnKey instanceof Instrument ? columnKey.name : columnKey
        );
        await exporter.export(convertedPositions, path.join(instancePath, 'positions.csv'));

        // Export performance indicator results
        // Re-format performance results; row 0: all names, row 1: all values
        const results = [[], []];
        instance.performanceResults.forEach((result, name) => {
            results[0].push(name);
            results[1].push(result);
        });
        exportToCsv(path.join(instancePath, 'performance.csv'), results);

        // Export instruments; instance.instruments is an instance of BacktestInstruments; to 
        // access the instruments, we have to call its instruments property.
        for (const instrument of instance.instruments.instruments) {
            await this.exportInstrument(instrument, instancePath);
        }

    }


    /**
     * Exports a single instrument's data (that belongs to a certain instance).
     * @param  {Instrument} instrument 
     * @param  {string} basePath         Path to export file to; file name is instrument's name.
     * @private
     */
    async exportInstrument(instrument, basePath) {
        const destination = path.join(basePath, instrument.name + '.csv');
        const exporter = new DataSeriesExporter();
        log('Export instrument %s to %s', instrument.name, destination);
        await exporter.export(instrument, destination);
        await this.exportInstrumentChartConfig(instrument, basePath);
    }


    /**
     * Export instrument as a Highstock config (Highcharts) to get a quick view at things
     * TODO: Use a vendor independent view format
     */
    async exportInstrumentChartConfig(instrument, basePath) {
        const exporter = new HighChartsExporter();
        exporter.export(instrument, basePath);
    }


    /**
     * Creates a directory if it does not exist
     * @param  {string} path        Path to directory that shall be created
     * @private
     */
    createDirectory(path) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                // No error thrown, directory exists
                if (!err) return resolve();
                log('Create directory %s', path);
                fs.mkdir(path, (err) => err ? reject(err) : resolve());
            });
        });
    }

}


