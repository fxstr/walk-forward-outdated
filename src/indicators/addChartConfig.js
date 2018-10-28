import getChartConfig from './getChartConfig';

/**
 * Adds config options to display a chart to an indicator. Extends existing classes created through
 * createIndicator
 * @param {class} indicator     Indicator created throgh createIndicator
 */
export default function addChartConfig(indicator) {
    return class extends indicator {
        getChartConfig() {
            return getChartConfig(indicator.identifier);
        }
    };
}