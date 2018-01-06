import test from 'ava';
import DataSeries from './DataSeries';



//////////////////// ADD DATA

test('add does not accept invalid data', (t) => {
	const ds = new DataSeries();
	t.throws(() => ds.add(1, 'string'), /is string/);
});

test('add adds data that can be retreived', (t) => {
	const ds = new DataSeries();
	ds.add(1, { col: 'first' });
	ds.add(2, { col: 'second' });
	// Same key can be added multiple times; order does not change.
	ds.add(1, { col: 'third' });
	const data = ds.data;
	t.is(data.length, 3);
	t.is(data[0].data.col, 'first');
	t.is(data[2].data.col, 'third');
});

test('data cannot be modified directly', (t) => {
	const ds = new DataSeries();
	t.throws(() => ds.data = 'test', /add/);
});





//////////////////// SET DATA

test('set data throws if argument or data is not valid', (t) => {
	const ds = new DataSeries();
	t.throws(() => ds.set({ test: true }), /no rows/);
	ds.add(1, { col: 'test' });
	t.throws(() => ds.set(true), /object/);
});

test('set adds data', (t) => {
	const ds = new DataSeries();
	ds.add(1, { col: 'value1' });
	ds.add(2, { col: 'value2' });
	const data = {
		newCol: 'value3'
	};
	// Test if symbols are also added
	const sym = Symbol();
	data[sym] = 'value4';
	ds.set(data);
	t.is(ds.head().data.newCol, 'value3');
	t.is(ds.head().data[sym], 'value4');
});

test('set does not overwrite data', (t) => {
	const ds = new DataSeries();
	const data = { col: 'value' };
	ds.add(1, data);
	t.throws(() => ds.set(data), /overwritten/);
});




//////////////////// READ DATA

function setupDataSeries() {
	const dataSeries = new DataSeries();
	const data1 = { col: 'test1' };
	dataSeries.add(1, data1);
	const data2 = { col: 'test2' };
	dataSeries.add(1, data2);
	const data3 = { col: 'test3' };
	dataSeries.add(2, data3);	
	return { 
		dataSeries, 
		data: [data1, data2, data3]
	};
}

test('head returns latest rows', (t) => {
	const { dataSeries, data } = setupDataSeries();
	t.deepEqual(dataSeries.head(), { key: 2, data: data[2] });
	t.deepEqual(dataSeries.head(2), [{ key: 2, data: data[2] }, { key: 1, data: data[1] }]);
});

test('tail returns first rows', (t) => {
	const { dataSeries, data } = setupDataSeries();
	t.deepEqual(dataSeries.tail(), { key: 1, data: data[0] });
	t.deepEqual(dataSeries.tail(2), [{ key: 1, data: data[0] }, { key: 1, data: data[1] }]);	
});

test('getDataByKey returns matching data', (t) => {
	const { dataSeries, data } = setupDataSeries();
	t.deepEqual(dataSeries.getDataByKey(1), [data[0], data[1]]);
});


