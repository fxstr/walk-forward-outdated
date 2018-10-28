import fs from 'fs';
import path from 'path';
import debug from 'debug';
import util from 'util';

const log = debug('HighChartsExporter');

/**
 * Quick win: Just export a data structure that highcharts will understand to simplify things. 
 * Code's not nice or tested. 
 * TODO: Move to a more abstract/generalized data format
 */
export default class HighChartsExporter {

    /**
     * Identifies the main chart; cannot use symbol (won't export correctly, won't work with
     * HighCharts: https://api.highcharts.com/highcharts/series.line.yAxis
     */
    mainChartIdentifier = 'main-chart'; 

    /**
     * Contains one entry for every single data series (o, h, l, c, sma, other transformers …)
     */
    series = [];

    /**
     * Contains one entry per chart; one chart may contain multiple data series (main contains 
     * o, h, l…)
     */
    charts = [];

    /**
     * Every chart needs an id; count them up
     */
    chartIdCounter = 0;

    /**
     * Charts are modified before they are added to this.charts; one chart may appear in multiple
     * series configs. Map original chart (from series config) to new map (from this.charts)
     * Key is original, value is new chart. If new chart exists, chart is not added to this.charts.
     */
    mappedCharts = new Map();


    /**
     * Returns sum of all heights of all charts. Is needed to calculate percent based height 
     * from relations. 
     * @returns {Number}
     */
    getTotalChartHeight() {
        const height = this.charts.reduce((prev, chart) => prev + chart.height, 0);
        log('Total chart height is %o from %o', height, this.charts);
        return height;
    }


    /**
     * Exports a single instrument/data series to a json file
     * @param  {[type]} instrument [description]
     * @return {[type]}            [description]
     */
    async export(dataSeries, basePath, name) {

        this.dataSeries = dataSeries;
        this.basePath = basePath;
        // dataSeries does not contain a name, but e.g. instrument (extended class) does
        this.name = name || dataSeries.name;

        log('Export %s to %s', this.name, basePath);

        this.createMainChart();
        this.exportOHLC();

        this.createDataForAllColumns();

        this.updateHeights();
        await this.writeData();
        log('Charts are %o', this.charts);

    }



    /**
     * Does an export for OHLC, re-formats data, sets chart to 'main'
     * @private
     */
    exportOHLC() {

        const ohlcDataArray = this.dataSeries.data.map((row) => {
            // Use array (as object doesn't work for > 1000 rows, see
            // https://api.highcharts.com/highstock/series.ohlc.data)
            return [
                row.get('date').getTime(),
                row.get('open'),
                row.get('high'),
                row.get('low'),
                row.get('close'),
            ];
        });

        this.series.push({
            type: 'ohlc',
            name: this.name,
            data: ohlcDataArray,
            yAxis: this.mainChartIdentifier,
        });

    }


    /**
     * Just sets up the main chart, adds it to this.charts
     * @private
     */
    createMainChart() {
        const mainConfig = {
            id: this.mainChartIdentifier,
            height: 1,
            title: {
                text: 'OHLC',
            },
        };
        this.charts.push(mainConfig);
        // Smart: If we look up a chart with a missing config (=undefined) later, mainChart will 
        // be used.
        this.mappedCharts.set(undefined, mainConfig);
    }


    /**
     * Go through all columns (and not the viewConfigs as we might miss some columns that 
     * were added *without* a config)
     * @private
     */
    createDataForAllColumns() {

        const colsToIgnore = ['open', 'high', 'low', 'close', 'date'];

        for (const [key] of this.dataSeries.columns) {
            if (colsToIgnore.includes(key)) continue;
            this.createDataForColumn(key);
        }

    }


    /**
     * Creates data (this.chart, this.series) for a given column
     * @private
     */
    createDataForColumn(columnKey) {

        const viewConfig = this.dataSeries.viewConfig &&
            this.dataSeries.viewConfig.chart &&
            this.dataSeries.viewConfig.chart.get(columnKey);

        let seriesConfig;
        let chartConfig;

        // There's a chart config for this column
        if (viewConfig) {
            seriesConfig = viewConfig.series;
            chartConfig = viewConfig.chart;
        }

        // Make sure seriesConfig is spreadable
        seriesConfig = seriesConfig || {};

        // Handle charts first: We need its ID to reference it by series
        // Chart may appear in multiple series configs. Only add it to this.charts once.
        let chart;
        console.log('chartConfig is %o', chartConfig);
        if (this.mappedCharts.has(chartConfig)) {
            chart = this.mappedCharts.get(chartConfig);
        } else {
            const spreadableChartConfig = chartConfig || {};
            chart = {
                ...spreadableChartConfig,
                height: chartConfig.height || 0.25,
                // Id must be a string or index of charts array will be used; always overwrite id,
                // use our internal one to prevent clashes
                id: `${this.chartIdCounter += 1}`,
            };
            this.charts.push(chart);
            console.log('push highcharts chart %o', chart);
            this.mappedCharts.set(chartConfig, chart);
        }

        console.log('chart is %o', chart);

        const highchartsSeries = {
            ...seriesConfig,
            yAxis: chart.id || this.mainChartIdentifier,
            data: this.createSeriesArrayFromColumn(columnKey),
            name: columnKey,
        };

        console.log('push highcharts series %o', highchartsSeries);
        this.series.push(highchartsSeries);


    }


    /**
     * Creates an array that can be used as data source for HighStock from c urrent dataSeries
     * @param  {*} columnKey
     * @return {Array}           Array with rows; every row has 2 entries (data, value)
     */
    createSeriesArrayFromColumn(columnKey) {
        return this.dataSeries.data
            // Remove all empty rows
            .filter((row) => row.get(columnKey) !== undefined)
            // Object -> Array
            .map((row) => [row.get('date').getTime(), row.get(columnKey)]);
    }


    /**
     * Update heights on all charts: from relative values (1 is highest possible) to percentage
     * values (based on total height of all charts)
     * @private
     */
    updateHeights() {
        const relativeSpace = 0.1;
        // Only get totalChartHeight once: afterwards we update chart.height to a string (e.g. 
        // '50%', adding up won't work any more); add 0.05 for spacing between charts
        const totalHeight = this.getTotalChartHeight() + this.charts.length * relativeSpace;
        // Update heights (from relations to percentages); previous value is used as top position
        // of current chart
        const percentageBasedSpace = relativeSpace / totalHeight;
        this.charts.reduce((topPosition, chart) => {
            const height = chart.height / totalHeight;
            log('Height %o of total %o, was %o', chart.height, totalHeight, chart.height);
            chart.height = Math.floor(height * 100) + '%';
            chart.top = Math.floor(topPosition * 100 + percentageBasedSpace) + '%';
            return topPosition + height + percentageBasedSpace;
        }, 0);

    }


    /**
     * Write data as JSON to file system
     */
    async writeData() {
        const highstockData = {
            series: this.series,
            yAxis: this.charts,
        };
        const filePath = path.join(this.basePath, this.name + '.json');
        const fileContent = JSON.stringify(highstockData, null, 2);
        log('Store JSON to', filePath);
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filePath, fileContent);
    }

}


