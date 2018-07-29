import fs from 'fs';
import path from 'path';

/**
 * Quick win: Just export a data structure that highcharts will understand to simplify things. 
 * Code's not nice or tested. 
 * TODO: Move to a more abstract/generalized data format
 */
export default class HighChartsExporter {

    /**
     * @param  {[type]} instrument [description]
     * @return {[type]}            [description]
     */
    async export(instrument, basePath) {

        console.log('High: export %s to %s', instrument.name, basePath);

        const series = [];
        const charts = [];

        // Height of all charts, needed to calculate percent based height from relations
        let totalChartHeight = 0;

        // Charts needs IDs; chartIdCounter counts them up
        let chartIdCounter = 0;


        // Main chart with OHLC
        charts.push({
            id: 'main',
            height: 1,
        });
        const ohlcData = instrument.data.map((row) => {
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
        series.push({
            type: 'ohlc',
            data: ohlcData,
            chart: 'main',
        });
        totalChartHeight += 1;



        // Every transformer added to instrument has its own chart viewConfig – go through them
        // and create configs for charts
        instrument.viewConfig.chart.forEach((chartConfig) => {

            console.log('chart config is %o', chartConfig);

            // Assumption: If chartConfig contains data for a chart, every transformer gets a 
            // *new* chart (new yAxis). If it's missing, use main chart.
            charts.push({
                // Use string as identifier; number would be interpreted as index
                id: '' + (chartIdCounter += 1) , 
                height: chartConfig.config.chart.height,
                title: {
                    text: chartConfig.config.chart.name,
                },
                // Store original transformer to later map columns/series to charts
                columns: chartConfig.columns,
            });                    
            // Default chart height is 1
            totalChartHeight += chartConfig.config.chart.height || 1;

        });


        console.log('charts are %o', charts);


        // Go through all columns (and not the viewConfigs as we might miss some columns that 
        // were added without config)
        for (const [key] of instrument.columns) {

            // ohlc are done, date has its own axis
            const colsToIgnore = ['open', 'high', 'low', 'close', 'date'];
            if (colsToIgnore.includes(key)) continue;

            const { chartConfig, seriesConfig } = this.getConfigFromViewConfig(
                instrument.viewConfig.chart,
                key,
            );

            console.log('seriesConfig: %o, chartConfig %o', seriesConfig, chartConfig);

            // Convert data to a format that we can use for series
            const seriesData = instrument.data
                // Remove all empty rows
                .filter((row) => row.get(key) !== undefined)
                // Object -> Array
                .map((row) => [row.get('date').getTime(), row.get(key)]);

            const chartId = chartConfig ? charts.find((chart) => {
                // OHLC doesn't have a columns field
                if (!chart.columns) return false; 
                // Check if any column in chartConfig includes the current column
                return Object.values(chart.columns).includes(key);
            }).id : 'main';

            const spreadableSeriesConfig = seriesConfig || {};
            series.push({
                ...spreadableSeriesConfig,
                //type: seriesConfig && seriesConfig.type ? seriesConfig.type : 'line',
                //color: seriesConfig && seriesConfig.color ? seriesConfig.color : 'black',
                data: seriesData, 
                yAxis: chartId,
            });

            console.log('chart&seriesConfig', chartConfig, seriesConfig);

        }


        // Update heights (from relations to percentages)
        charts.reduce((prev, chart) => {
            const height = chart.height / totalChartHeight;
            console.log('height %o of %o', chart.height, totalChartHeight);
            chart.height = Math.floor(height * 100) + '%';
            chart.top = Math.floor(prev * 100) + '%';
            return prev + height;
        }, 0);


        // Remove all columns from chart (were only needed for mapping between charts and
        // series)
        charts.forEach((chart) => delete chart.columns);


        const finalData = {
            series: series,
            yAxis: charts,
        };


        const filePath = path.join(basePath, instrument.name + '.json');
        const fileContent = JSON.stringify(finalData, null, 2);
        console.log('filePath', filePath);
        console.log('fileContent', fileContent);
        fs.writeFileSync(filePath, fileContent);

    }




    /**
     * Find key of current column in 
     * @returns {object}        Properties: chartConfig, seriesConfig
     * @private
     */
    getConfigFromViewConfig(viewConfigs, key) {

        let result = {};

        // Find column config belonging to key in viewConfig[].columns
        viewConfigs.find((viewConfig) => {

            if (!viewConfig.hasOwnProperty('columns')) {
                throw new Error(`HighChartsExporter: Columns property missing in viewConfig for
                    ${ JSON.stringify(viewConfig) }.`);
            } 

            if (!viewConfig.config) {
                throw new Error(`HighChartsExporter: Config property missing in viewConfig for 
                    ${ JSON.stringify(viewConfig) }.`);
            }

            const config = viewConfig.config;

            // columns is an object
            if (typeof viewConfig.columns === 'object' && viewConfig.columns !== null) {

                const found = Object.keys(viewConfig.columns).find((originalColName) => {
                    console.log('key map', originalColName, viewConfig.columns[originalColName]);
                    if (viewConfig.columns[originalColName] === key) {
                        console.log('key found, is %o, conf is %o', originalColName, viewConfig);
                        console.log('SERIES', config.series, originalColName);
                        result = {
                            chartConfig: config.chart,
                            seriesConfig: config.series ? 
                                config.series.get(originalColName) : undefined,
                        };
                        return true; // Found, break find loop
                    }
                });

                if (found) return true;

            } 

            // columns is something else (not an object); check if it equals key
            else {
                if (viewConfig.columns === key ) {
                    result = {
                        chartConfig: config.chart,
                        // If transformer returned just one value, we can use the value of the first entry 
                        // in config.series
                        seriesConfig: Array.from(config.series)[0][1],
                    };
                    return true;
                }
            }

        });

        return result;

    }

}


