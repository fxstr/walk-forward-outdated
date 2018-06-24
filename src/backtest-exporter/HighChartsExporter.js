import fs from 'fs';
import path from 'path';

export default class HighChartsExporter {

    /**
     * Quick win: Just export a data structure that highcharts will understand to simplify things
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
        instrument.viewConfig.chart.forEach((chartConfig) => {

            // Assumption: If chartConfig contains data for a chart, every transformer gets a 
            // *new* chart (new yAxis). If it's missing, use main chart.
            charts.push({
                id: chartIdCounter++,
                height: chartConfig.config.height,
                title: {
                    text: chartConfig.config.name,
                },
                // Store original transformer to later map columns/series to charts
                columns: chartConfig.columns,
            });                    
            // Default chart height is 1
            totalChartHeight += chartConfig.height || 1;

        });


        // Go through all columns (and not the viewConfigs as we might miss some columns that 
        // were added without config)
        for (const [key] of instrument.columns) {
            // ohlc are done, date has its own axis
            const colsToIgnore = ['open', 'high', 'low', 'close', 'date'];
            if (colsToIgnore.includes(key)) continue;

            // Check if we have a chartConfig for current column; chartConfig is an entry in charts
            // created above
            const chartConfig = instrument.viewConfig.chart.find((config) => {
                console.log('key %o chartConfig %o', key, config.columns)
                // columns can either be a symbol/string or an object (if indicator returns 
                // multiple values)
                return config.columns === key || config.columns[key] !== undefined;
            });

            // Convert data to a format that we can use for series
            const seriesData = instrument.data
                .filter((row) => row.get(key) !== undefined)
                .map((row) => [row.get('date').getTime(), row.get(key)]);


            console.log('Found chartConfig %o for key %o', chartConfig, key);
            // Column has its own chartConfig
            if (chartConfig) {

                // Get configuration object for current series/column.
                // If transformer returned just one value, we can use the value of the first entry 
                // in chartConfig.series
                let seriesConfig = Array.from(chartConfig.series)[0][1];
                // If transformer returned multiple values, get correct entry in chartConfig.series
                if (typeof chartConfig.columns === 'object' && chartConfig.columns !== null) {
                    // columns is an object with { originalName: newName }, key corresponds to 
                    // newName – now get the originalName
                    const originalColName = Object.keys(chartConfig.columns)
                        .find((columnKey) => chartConfig.columns[columnKey] === key);
                    seriesConfig = chartConfig.series.get(originalColName);
                }
                console.log('seriesConfig', seriesConfig);

                series.push({
                    type: seriesConfig.type || 'line',
                    data: seriesData,
                    yAxis: chartConfig.id,
                });
            }

            // There is no chartConfig for this column: use defaults
            else {
                series.push({
                    type: 'line',
                    data: seriesData,
                    yAxis: 'main',
                });
            }

        }


        // Update heights (from relations to percentages)
        charts.reduce((prev, chart) => {
            const height = chart.height / totalChartHeight;
            chart.height = (height * 100) + '%';
            chart.top = (prev * 100) + '%';
            return prev + height;
        }, 0);


        const finalData = {
            series: series,
            charts: charts,
        };


        const filePath = path.join(basePath, instrument.name + '.json');
        const fileContent = JSON.stringify(finalData, null, 2);
        console.log('filePath', filePath);
        console.log('fileContent', fileContent);
        fs.writeFileSync(filePath, fileContent);

    }

    /**
     * In TransformableDataSeries, transformers and key maps are stored. Use key map to reverse-
     * engineer the original key used by Transformer
     * @private
     */
    /*getTransformerKey(instrument, transformer, key) {
        instrument.transformers.forEach((transformer) => {

        });
    }*/


}