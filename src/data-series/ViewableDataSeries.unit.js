import test from 'ava';
import ViewableDataSeries from './ViewableDataSeries';

function createTransformer(chartConfig) {
    return class {
        next(data) {
            return data;
        }
        getChartConfig() {
            return chartConfig;
        }
    };
}

test('checks return values of getChartConfig metohd', (t) => {
    
    const vds = new ViewableDataSeries();
    
    // config pesent and not an object
    t.throws(() => vds.addTransformer(
        ['test'],
        new (createTransformer('invalid')),
        Symbol()),
        /be an object, is string/,
    );
    
    // chart pesent and not an object (but string)
    t.throws(() => vds.addTransformer(
        ['test'], 
        new (createTransformer({ chart: 'invalid' })),
        Symbol()),
        /chart, it must be an object, is string/,
    );
    
    // One key, config.chart is not an object
    t.throws(() => vds.addTransformer(
        ['test'],
        new (createTransformer({ series: 'notAnObject' })),
        Symbol()),
        /'series', it must be an object/,
    );
    
    // Multiple keys, config.series is not an object
    t.throws(() => vds.addTransformer(
        ['test'],
        new (createTransformer({ series: 'test' })),
        {}),
        /it must be an object if keys/,
    );

    // Undefined as return value works
    t.notThrows(() => vds.addTransformer(
        ['test'],
        new (createTransformer()),
        Symbol())
    );

});



test('works with a transformer that returns a single value', async (t) => {

    const Transformer = createTransformer({
        chart: {
            name: 'newChart',
        },
        // Object instead of a map
        series: {
            name: 'seriesName',
        }
    });

    const vds = new ViewableDataSeries();
    vds.addTransformer(['field'], new Transformer(), 'key');
    t.deepEqual(vds.viewConfig.chart, new Map([
        ['key', {
            series: { name: 'seriesName' },
            chart: { name: 'newChart' },
        }]
    ]));

});



test('works with a transformer that returns multiple values', async (t) => {

    const Transformer = createTransformer({
        chart: {
            name: 'newChart',
        },
        // Object instead of a map
        series: {
            'key1': { name: 'seriesName1' },
            'key2': { name: 'seriesName2' },
        }
    });

    const vds = new ViewableDataSeries();
    vds.addTransformer(['field'], new Transformer(), { key1: 'newKey1', key2: 'newKey2' });
    // config from getChartConfig is added to viewConfig chart[0].config by ViewableDataSeries!
    t.deepEqual(vds.viewConfig.chart, new Map([
        [
            'newKey1', {
                series: { name: 'seriesName1' },
                chart: { name: 'newChart' },
            }
        ], [
            'newKey2', {
                series: { name: 'seriesName2' },
                chart: { name: 'newChart' },
            }
        ]
    ]));

});


