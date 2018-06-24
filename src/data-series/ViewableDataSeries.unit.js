import test from 'ava';
import ViewableDataSeries from './ViewableDataSeries';

test('test', async (t) => {
    const chartConfig = {
        view: 'test',
    };
    class Transformer {
        next(data) {
            return data + 1;
        }
        getChartConfig() {
            return chartConfig;
        }
    }
    const vds = new ViewableDataSeries();
    vds.addTransformer(['close'], new Transformer(), 'test');
    vds.addTransformer(['test'], new Transformer(), { name: 'newName' });
    await vds.add(new Map([['open', 5]]));
    // One config is added per transformer
    t.deepEqual(vds.viewConfig.chart, [{
        columns: 'test',
        config: chartConfig,
    }, {
        columns: { name: 'newName' },
        config: chartConfig
    }]);
});