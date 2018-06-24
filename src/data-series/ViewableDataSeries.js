import TransformableDataSeries from './TransformableDataSeries';

/**
 * Extends a TransformableDataSeries with view options (configuration to display charts)
 */
export default class ViewableDataSeries extends TransformableDataSeries {

    /**
     * @type {object}
     * May contain view configs for charts, tables, etc.
     */
    viewConfig = { chart: [] };

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
        if (typeof transformer.getChartConfig === 'function' && transformer.getChartConfig()) {
            this.viewConfig.chart.push({
                // We need to know the column keys as there might be multiple transformers of the
                // same kind. If there are, we wouldn't know to which transformer (and therefore 
                // to which chart) a column belongs (we could go from key to original column 
                // name of the indicator – but no further)
                columns: keys,
                config: transformer.getChartConfig()
            });
        }
    }

}