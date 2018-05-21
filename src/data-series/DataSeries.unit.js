import test from 'ava';
import DataSeries from './DataSeries';



//////////////////// ADD DATA

test('add does not accept invalid data', (t) => {
	const ds = new DataSeries();
	t.throws(() => ds.add('string'), /must be a Map/);
});

test('add adds data that can be retreived', (t) => {
	const ds = new DataSeries();
	ds.add(new Map([['col', 'first']]));
	ds.add(new Map([['col', 'second']]));
	// Same key can be added multiple times; order does not change.
	ds.add(new Map([['col', 'third']]));
	const data = ds.data;
	t.is(data.length, 3);
	t.is(data[0].get('col'), 'first');
	t.is(data[2].get('col'), 'third');
});

test('data cannot be modified directly', (t) => {
	const ds = new DataSeries();
	t.throws(() => ds.data = 'test', /add/);
});

test('objects are valid parameters', (t) => {
	const ds = new DataSeries();
	ds.add({ 'col1': 'first' });
	t.is(ds.data[0].size, 1);
	t.is(ds.data[0].get('col1'), 'first');
});



//////////////////// SET DATA

test('set data throws if argument or data is not valid', (t) => {
	const ds = new DataSeries();
	t.throws(() => ds.set(new Map([['test', true]])), /no rows/);
	ds.add(new Map([['col', 'test']]));
	t.throws(() => ds.set(true), /Map/);
});

test('set adds data', (t) => {
	const ds = new DataSeries();
	ds.add(new Map([['col', 'value1']]));
	ds.add(new Map([['col', 'value2']]));
	// Test if symbols are also added
	const sym = Symbol();
	const data = new Map([['newCol', 'value3'], [sym, 'value4']]);
	ds.set(data);
	t.is(ds.head().get('newCol'), 'value3');
	t.is(ds.head().get(sym), 'value4');
});

test('objects are valid parameters for set', (t) => {
	const ds = new DataSeries();
	ds.add(new Map([['col', 'value']]));
	ds.set({ 'col1': 'value1' });
	t.is(ds.data[0].size, 2);
	t.is(ds.data[0].get('col1'), 'value1');
});

test('set does not overwrite data', (t) => {
	const ds = new DataSeries();
	const data = new Map([['col', 'value']]);
	ds.add(data);
	t.throws(() => ds.set(data), /overwritten/);
});

// This was a real issue: new cols added through «set» were added to the original (!) Map.
test('set does not change original data', (t) => {
	const ds = new DataSeries();
	const addData = new Map([['col', 'value1']]);
	const originalAddData = new Map(addData);
	ds.add(addData);
	const data = new Map([['newCol', 'value3']]);
	const originalData = new Map(data);
	ds.set(data);
	t.deepEqual(data, originalData);
	t.deepEqual(addData, originalAddData);
});




//////////////////// COLUMN DATA

test('updates columns', (t) => {
	const ds = new DataSeries();
	ds.add(new Map([['a', 1], ['b', 2]]));
	const d = Symbol();
	ds.set(new Map([['c', 1]]));
	ds.add(new Map([['a', 1], [d, 1]]));
	t.is(ds.columns.size, 4);
	t.is(ds.columns.get(d).description, '');
});





//////////////////// READ DATA

function setupDataSeries() {
	const dataSeries = new DataSeries();
	const data1 = new Map([['col', 'test1']]);
	dataSeries.add(data1);
	const data2 = new Map([['col', 'test2']]);
	dataSeries.add(data2);
	const data3 = new Map([['col', 'test3']]);
	dataSeries.add(data3);	
	return { 
		dataSeries, 
		data: [data1, data2, data3]
	};
}

test('head returns latest rows', (t) => {
	const { dataSeries, data } = setupDataSeries();
	t.deepEqual(dataSeries.head(), data[2]);
	t.deepEqual(dataSeries.head(2), [data[2], data[1]]);
	t.deepEqual(dataSeries.head(2, 1), [data[1], data[0]]);
	t.deepEqual(dataSeries.head(2, 2), [data[0]]);
});

test('head works with empty DataSeries', (t) => {
	const dataSeries = new DataSeries();
	t.deepEqual(dataSeries.head(), undefined);
});

test('tail returns first rows', (t) => {
	const { dataSeries, data } = setupDataSeries();
	t.deepEqual(dataSeries.tail(), data[0]);
	t.deepEqual(dataSeries.tail(2), [data[0], data[1]]);	
	t.deepEqual(dataSeries.tail(2, 1), [data[1], data[2]]);	
	t.deepEqual(dataSeries.tail(2, 2), [data[2]]);	
});

test('tail works with empty DataSeries', (t) => {
	const dataSeries = new DataSeries();
	t.deepEqual(dataSeries.tail(), undefined);
});

/*test('getDataByKey returns matching data', (t) => {
	const { dataSeries, data } = setupDataSeries();
	t.deepEqual(dataSeries.getDataByKey(1), [data[0], data[1]]);
});*/




//////////////////// FROM

test('static from works as expected', (t) => {
	const ds = new DataSeries();
	ds.add(new Map([['a', 1], ['b', 2]]));
	t.throws(() => DataSeries.from([]), /existing DataSeries/);
	t.throws(() => DataSeries.from(ds, null), /must be a function/);
	const clone = DataSeries.from(ds);
	t.is(clone instanceof DataSeries, true);
});




