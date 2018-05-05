import test from 'ava';
import path from 'path';
import BacktestCSVSource from './BacktestCSVSource';

function setupData() {
	function instrumentNameFunction(name) {
		// Get file name, use it as instrument name
		return name.match(/.*\/([^/]*)\.csv$/)[1];
	}
	return { instrumentNameFunction };
}

test('throws correct errors on init', (t) => {
	t.throws(() => new BacktestCSVSource(), /First argument/);
});

test('throws errors on read', async (t) => {
	// Invalid return value of file name function
	const { instrumentNameFunction } = setupData();
	const csv1 = new BacktestCSVSource(
		function() { return false; },
		[path.join(__dirname, 'backtest*/*.csv')],
	);
	const err1 = await t.throws(csv1.read());
	t.is(err1.message.indexOf('Instrument not provided') > -1, true);
	// Date missing in CSV
	const csv2 = new BacktestCSVSource(
		instrumentNameFunction,
		[path.join(__dirname, 'backtest*/no-date.csv')],
	);
	const err2 = await t.throws(csv2.read());
	t.is(err2.message.indexOf('date field') > -1, true);
});


test('reads files', async (t) => {
	const { instrumentNameFunction } = setupData();
	const csv = new BacktestCSVSource(
		instrumentNameFunction,
		[path.join(__dirname, 'backtest*/t*.csv')],
	);
	const result = await csv.read();
	t.is(result.length, 8);
	// 4 rows in test1
	const firstItem = result[0];
	t.deepEqual(firstItem.get('date'), new Date('2018-01-02'));
	t.is(firstItem.get('instrument'), 'test1');
	t.is(firstItem.get('open'), 3);
	t.is(firstItem.get('high'), 6);
	t.is(firstItem.get('low'), 2);
	t.is(firstItem.get('close'), 5);
});
