import test from 'ava';
import path from 'path';
import GenericCSVSource from './GenericCSVSource';

test('constructor: checks arguments', (t) => {
	t.throws(() => new GenericCSVSource(5), /array/);
	t.notThrows(() => new GenericCSVSource([]), /array/);
	t.notThrows(() => new GenericCSVSource('test'), /array/);
});

test('reads single csv', async (t) => {
	const csv = new GenericCSVSource([path.join(__dirname, 'test*/t*1.csv')]);
	const result = await csv.read();
	t.is(result.length, 1);
	// Number of rows
	t.is(/test1\.csv$/.test(result[0].file), true);
	t.is(result[0].content.length, 4);
	t.deepEqual(Object.keys(result[0].content[0]), [ 'rowA', 'rowB', 'rowC' ]);
	t.deepEqual(Object.values(result[0].content[0]), [ '5', '1', '8' ]);
});

test('reads multiple csvs', async (t) => {
	const csv = new GenericCSVSource([path.join(__dirname, 'test*/t*.csv')]);
	const result = await csv.read();
	t.is(result.length, 2);
});

test('does not start a new read for every time read is called', async (t) => {
	const csv = new GenericCSVSource([path.join(__dirname, 'test*/t*.csv')]);
	const result1 = csv.read();
	const result2 = csv.read();
	// Check if the same promise is returned
	t.is(result1, result2);
	await Promise.all([result1, result2]);
});

test('returns false if all data was read', async (t) => {
	const csv = new GenericCSVSource([path.join(__dirname, 'test*/t*.csv')]);
	await csv.read();
	const doneResult = await csv.read();
	t.is(doneResult, false);
});

test('returns error if file is invalid', async (t) => {
	const csv = new GenericCSVSource([path.join(__dirname, 'test*/invalid-test.csv')]);
	await t.throwsAsync(() => csv.read());
});