/**
 * Returns a chart config for a transformer that's identified by identifier. Use a function 
 * (instead of an object) to make use of keys (key must be re-generated with every call; if
 * we export an object, it will only be instantiated once).
 * @param {String} identifier       Identifier for the transformer (name of tulip indicators) 
 *                                  for which config shoud be added.
 * @return {object}                 configuration for transformer of type identifier
 */
export default function getChartConfig(identifier) {
    
    // Create a symbol that we can use to match 
    // const key = Symbol();

    const configs = {
        // Key is identifier of tulip indicator
        stoch: {
            chart: {
                name: 'Stochastic Oscillator',
                height: 0.2,
            },
            series: {
                'stoch_k': {
                    type: 'line',
                    color: 'red',
                },
                'stoch_d': {
                    type: 'line',
                },
            },
        },
    };

    return configs[identifier];

}

