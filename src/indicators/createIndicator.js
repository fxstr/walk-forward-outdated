import debug from 'debug';
const log = debug('WalkForward:createIndicator');

/**
 * A factory function that creates indicators from tulind
 */
export default function createIndicator(indicatorConfig) {

    return class {

        // We'll store past values in this.history as options (e.g. sma length) might change and 
        // previous values might be required to calculate the result.
        // Create one item per input needed
        history = Array.from({ length: indicatorConfig.inputs }).map(() => []);

        constructor(...args) {
            if (args.length !== indicatorConfig.options) {
                throw new Error(`Indicators/${ indicatorConfig.name}: Number of constructor  
                    arguments required: ${ indicatorConfig.options }, arguments provided: 
                    ${ args.join(', ') }, expected ${ indicatorConfig.option_names.join(', ') }.`);
            }
            // Store options
            this.options = args;
        }

        /**
         * Add number(s) to indicator, then call it
         * @param  {values} values     number
         * @return {Promise}
         */
        next(...values) {

            // Test number of arguments passed
            if (values.length !== indicatorConfig.inputs) {
                throw new Error(`Indicators/${ indicatorConfig.name }: Arguments passed to
                    next(): ${ values.join(', ') }, expected: 
                    ${ indicatorConfig.input_names.join(', ') }.`);
            }

            // Add value to history: History is an array A of arrays B where one array A is created
            // per value passed.
            values.forEach((value, index) => this.history[index].push(value));

            return new Promise((resolve, reject) => {
                indicatorConfig.indicator(this.history, this.options, (err, results) => {
                    log('next() called with %o, error is %o, result %o', this.history, err, 
                        results);
                    if (err) reject(err);
                    // tulip returns an array of results, going back in time; just return the 
                    // most recent result *if* all ouputs have a length of 0; else return [].
                    const cleanResult = results.every((result) => result.length) ? 
                        results.map((result) => result[result.length - 1]) : [];
                    resolve(cleanResult);
                });
            });

        }
    };

}