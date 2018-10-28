import path from 'path';
import test from 'ava';
import del from 'del';
import fs from 'fs';
import compareDir from 'dir-compare';
import HighChartsExporter from './HighChartsExporter';
import Instrument from '../instrument/Instrument';
import ViewableDataSeries from '../data-series/ViewableDataSeries';


function clearDirectory() {
    const output = path.join(__dirname, 'test-data/output');
    del.sync(output);
    fs.mkdirSync(output);
}


function setup() {

    // No config: Should be addeda new chart as a line
    class AdditionTransformer {
        constructor(summand) {
            this.summand = summand;
        }
        next(data) {
            return data + this.summand;
        }
    }

    // Same as AdditionTransformer, but with config
    class AdditionMainTransformer extends AdditionTransformer {
        getChartConfig() {
            return {
                // No chart config: add to main chart
                series: {
                    type: 'line',
                    color: 'red',
                    name: 'Addition',
                }
            };
        }
    }

    // Same as AdditionTransformer, but with config for a separate chart
    class AdditionOtherChartTransformer extends AdditionTransformer {
        getChartConfig() {
            return {
                chart: {
                    title: {
                        text: 'AdditionOtherChartTransformerChart',
                    },
                },
                series: {
                    name: 'AdditionOtherChartTransformer',
                }
            };
        }
    }

    // Tests for multiple series and a separate chart
    class MultiAdditionTransformer {
        summands = [1, 2];
        next(data) {
            return this.summands.reduce((prev, summand) => {
                prev.set(`add${summand}`, data + summand);
                return prev;
            }, new Map());
        }
        getChartConfig() {
            return {
                chart: {
                    title: {
                        text: 'multiSummand', 
                    },
                    height: 0.6,
                },
                series: {
                    'add1': {
                        color: 'blue',
                    },
                    'add2': {
                        color: 'gray'
                    }
                }
            };
        }
    }

    const series = new Instrument('testName');
    series.addTransformer(['close'], new AdditionTransformer(2), 'normalAddition');
    series.addTransformer(['close'], new AdditionMainTransformer(3), 'mainAddition');
    series.addTransformer(['close'], new AdditionOtherChartTransformer(1), 'otherAddition');
    series.addTransformer(['close'], new MultiAdditionTransformer(), { 
        'add1': 'add1Key',
        'add2': 'add2Key',
    });

    return { AdditionTransformer, AdditionMainTransformer, MultiAdditionTransformer, series };
}


/**
 * Adds data to any series passed
 * @param {DataSeries} dataSeries       DataSeries to add data to
 */
async function addData(dataSeries) {

    // o, h, l, c
    const data = [
        [5, 7, 4, 5],
        [5, 8, 5, 6],
    ];

    let index = 1;
    for (const datum of data) {
        await dataSeries.add({
            date: new Date(2018, 0, index),
            open: datum[0],
            high: datum[1],
            low: datum[2],
            close: datum[3],
        });
        index += 1;
    }
}


/**
 * Expected result: 3 Charts
 * - 'main' with OHLC and 2 lines: +3/red and +2/default color
 * - 'AdditionOtherChartTransformerChart' with +1/default color
 * - 'multiSummand' with +1/blue and +2/gray
 */
test('exports correct json file for instrument', async (t) => {

    clearDirectory();
    const { series } = setup();

    await addData(series);

    const exporter = new HighChartsExporter();
    await exporter.export(series, path.join(__dirname, 'test-data/output'));
    
    const result = compareDir.compareSync(
        path.join(__dirname, 'test-data/output/testName.json'),
        path.join(__dirname, 'test-data/expectation/testName.json'),
        { compareContent: true },
    );

    t.is(result.differences, 0);

});



/**
 * We also need to export simple data series for accounts etc. They don't contain a name property
 * Expect: Series' name is 'myOwnName'.
 */
test('exports data series (without name/view config)', async (t) => {
    const series = new ViewableDataSeries();
    await addData(series);
    const exporter = new HighChartsExporter();
    const name = 'myOwnName';
    // Third arg serves as file name
    await exporter.export(series, path.join(__dirname, 'test-data/output'), name);
    const result = compareDir.compareSync(
        path.join(__dirname, `test-data/output/${name}.json`),
        path.join(__dirname, `test-data/expectation/${name}.json`),
        { compareContent: true },
    );
    t.is(result.differences, 0);
});



