import exportToCsv from '../export-to-csv/exportToCsv';
import logger from '../logger/logger';
import colors from 'colors';
import DataSeries from '../data-series/DataSeries';

const { debug } = logger('WalkForward:DataSeriesExporter');

/**
 * Exports one or multiple DataSeries for a given configuration. Use a class in order to persist 
 * the configuration and use it for multiple DataSeries.
 */
export default class DataSeriesExporter {
    

    /**
     * Sets the fields to export and their order
     * @param {array} orderedFields     An array of keys used in the Map that holds the DataSerie's
     *                                  data.
     */
    /*setFields(orderedFields) {
        if (!Array.isArray(orderedFields)) {
            throw new Error(`DataSeriesExplorer: first argument for setFields must be an array`);
        }
        this.orderedFields = orderedFields;
    }*/


    /**
     * Does the actual export.
     * @param  {DataSeries} dataSeries      DataSeries to export.
     * @param  {string} path                Path (including file name) to store the export under.
     */
    async export(dataSeries, path) {

        if (!dataSeries || !(dataSeries instanceof DataSeries)) {
            throw new Error(`DataSeriesExplorer: First argument for export must e a valid 
                DataSeries.`);
        }

        if (!path || typeof path !== 'string') {
            throw new Error(`DataSeriesExplorer: Pass a valid path as second argument.`);
        }

        //this.checkCols(dataSeries);
        const formattedData = this.reformatData(dataSeries);
        await this.storeData(formattedData, `${path}.csv`);

    }


    /**
     * Sees if all columns of this.orderedFields are available, prints a warning if not.
     * @private
     */
    /*checkCols(dataSeries) {
        this.orderedFields.forEach((col) => {
            if (!dataSeries.columns.has(col)) {
                console.log(colors.yellow(`WARNING: Column %o is part of orderedFields in 
                    DataSeriesExporter but not a valid column of DataSeries`), col);
            }
        });
    }*/

    

    /**
     * Reformats dataSeries to 2-dimensional array that's accepted by fastCsv
     * @param  {DataSeries} dataSeries
     * @return {array[]}                      e.g. [[col1, col2], [row1col1, row1col2]]
     * @private
     */
    reformatData(dataSeries) {
        const head = dataSeries.columns;
        const result = [[]];
        // Create head row
        for (const [key, value] of head) {
            let headField = value.description || key;
            // We advise users to use Symbols as col keys; be sure to give a meaningful warning
            // if they don't provide a description.
            if (typeof headField === 'symbol') {
                console.log(colors.yellow(`DataSeriesExporter: If you use a Symbol as a column key, 
                    also provide a description for the column that can be used for the CSV export.
                    Column affected is %o`), headField);
                headField = 'Unspecified Symbol()';
            }
            result[0].push(headField);
        }
        // Create content rows
        for (const dataRow of dataSeries.data) {
            const resultRow = [];
            for (const [col] of head) {
                let content = dataRow.get(col);
                // Make sure we output 0 (but not undefined)
                if (content === undefined) content = '';
                resultRow.push(content);
            }
            result.push(resultRow);
        }
        return result;
    }


    /**
     * Stores data in a CSV file
     * @param  {Array[]} dataAsArray        Data to store in a two-dimensional array (one row
     *                                      per array entry)
     * @returns {Promise}
     * @private
     */
    storeData(dataAsArray, path) {

        debug('Write %d entries to %s', dataAsArray[0].length, path);
        return exportToCsv(path, dataAsArray);

    }

}

