import TransformableDataSeries from './TransformableDataSeries';

/**
 * Extends a TransformableDataSeries with view options (configuration to display charts)
 */
export default class ViewableDataSeries extends TransformableDataSeries {

    /**
     * @type {object}
     * May contain view configs for charts, tables, etc.
     * Chart is a map with 
     * - key:   name of column (e.g. a Symbol)
     * - value: object with props chart and series; chart may be contained in multiple entries of 
     *          this map!
     */
     
    viewConfig = { chart: new Map() };

    /**
     * Overwrite addTransformer method: Extract chartConfig from transformer and store it in 
     * this.viewConfig
     * TODO: Allow users to overwrite chartConfig data as a 4th argument to addTransformer
     * @param properties            see TransformableDataSeries
     * @param {object} transformer  Transformer that might also have a getChartConfig method which
     *                              returns the view config data.
     * @param keys                  see TransformableDataSeries
     */
    addTransformer(properties, transformer, keys) {
        super.addTransformer(properties, transformer, keys);

        if (
            typeof transformer.getChartConfig !== 'function' || 
            transformer.getChartConfig() === undefined
        ) {
            return;
        }

        const config = transformer.getChartConfig();

        // Check object returned by getChartConfig
        if (typeof config !== 'object' || config === null) {
            console.log('config is', config);
            throw new Error(`ViewableDataSeries: Type of value returned by getChartConfig() must
                be an object, is ${typeof config}`);
        }
        // Check config.chart
        if (config.chart !== undefined) {
            if (typeof config.chart !== 'object' || config.chart === null) {
                throw new Error(`ViewableDataSeries: If getChartConfig() on a transformer returns
                    a chart, it must be an object, is ${typeof(config.chart)}.`);
            }
        }
        // config.series is present: Check if it's valid
        if (config.series !== undefined) {
            if (typeof keys === 'object' && keys !== null) {
                if (typeof config.series !== 'object' || config.series === null) {
                    throw new Error(`ViewableDataSeries: If getChartConfig() on a transformer 
                        returns a property 'series', it must be an object if keys passed to  
                        transformer are an object, is ${typeof(config.series)}.`);
                }
            } else {
                if (config.series === null || typeof config.series !== 'object') {
                    throw new Error(`ViewableDataSeries: If getChartConfig() on a transformer
                        returns a property 'series', it must be an object if keys passed to
                        transformer are not a Map, is ${typeof(config.series)}.`);
                }
            }
        }

        // Transformer returns a single value
        if (typeof keys === 'object' && keys !== null) {
            // Transformer returns multi-value
            Object.keys(keys).forEach((key) => {
                // key is the original name (in the transformer), therefore keys[key] is the new
                // name of the col in the series
                this.viewConfig.chart.set(keys[key], {
                    series: config.series[key],
                    chart: config.chart,
                });
            });
        } else {
            this.viewConfig.chart.set(keys, {
                series: config.series,
                chart: config.chart,
            });
        }

    }

}

