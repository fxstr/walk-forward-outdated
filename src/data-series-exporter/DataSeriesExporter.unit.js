import fs from 'fs';
import path from 'path';
import test from 'ava';
import del from 'del';
import DataSeriesExporter from './DataSeriesExporter';
import DataSeries from '../data-series/DataSeries';

// Destroy and create test-data directory
try {
    const dir = path.join(__dirname, 'test-data');
    del.sync(dir);
    fs.mkdirSync(dir);
}
catch(err) {
    console.log('Could not remove/create directory', err);
}


function setupData() {
    const exporter = new DataSeriesExporter();
    const symbol = Symbol();
    const dataSeries = new DataSeries();
    dataSeries.add(new Map([[symbol, 2], ['col1', 3]]));
    dataSeries.add(new Map([['col2', 1], ['col1', 2]]));
    // Test if 0 is printed correctly (and not as '')
    dataSeries.add(new Map([['col1', 0], [symbol, 2]]));
    const target = path.join(__dirname, 'test-data/test.csv'); 
    return { exporter, dataSeries, symbol, target };
}


/*test('setField throws on invalid data', (t) => {
    const dse = new DataSeriesExporter();
    t.throws(() => dse.setFields('nonarray'), /be an array/);
});*/

test('export throws on invalid data', async (t) => {
    const dse = new DataSeriesExporter();
    const err = await t.throws(() => dse.export('nonarray'));
    t.is(err.message.includes('must e a valid'), true);
    const err1 = await t.throws(() => dse.export(new DataSeries(), ['notstring']));
    t.is(err1.message.includes('Pass a valid path'), true);
});

/*test('sorts and outputs cols correctly', async (t) => {
    const dse = new DataSeriesExporter();
    const sym = Symbol();
    dse.setFields([sym, 'invalid', 'col1']);
    const ds = new DataSeries();
    // a missing
    ds.add(new Map([[sym, 2], ['col1', 3]]));
    // both missing
    ds.add(new Map([['col2', 1], ['col1', 2]]));
    // both there, inverse order
    ds.add(new Map([['col1', 1], [sym, 2]]));
    await dse.export(ds, path.join(__dirname, 'test-data/test.csv'));
    t.pass();
});*/

/*test('throws if column key is a symbol', async (t) => {
    const {dataSeries, exporter, target } = setupData();
    const err = await t.throws(() => exporter.export(dataSeries, target));
    t.is(err.message.includes('Symbol as a column key'), true);
});*/

test('exports data correctly', async (t) => {
    const { dataSeries, exporter, symbol, target } = setupData();
    // Use description as head field if present
    dataSeries.columns.get(symbol).description = 'test';
    // Symbol() becomes 'Unspecified Symbol()'
    dataSeries.set(new Map([[Symbol(), 'symbolContent']]));
    await exporter.export(dataSeries, target);
    const written = await fs.readFileSync(target, 'utf8');
    t.is(written, 'test,col1,col2,Unspecified Symbol()\n2,3,,\n,2,1,\n2,0,,symbolContent');
    fs.unlinkSync(target);
});

test('exports fails with invalid data', async (t) => {
    const dse = new DataSeriesExporter();
    // Target missing
    await t.throws(() => dse.storeData([['a','b'], [1, 2, 3, 4]]));
});





