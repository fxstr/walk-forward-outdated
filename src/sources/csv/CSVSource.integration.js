import test from 'ava';
import CSVSource from './CSVSource';

test('constructor: checks arguments', (t) => {
	t.throws(() => new CSVSource('notanarray'), /array/);
	t.throws(() => new CSVSource(['inavalidPath.csv']), /not exist/);
});

test('reads csv', (t) => {
	const csv = new CSVSource(['src/sources/csv/test-data/test.csv']);
	csv.read();
	t.pass();
});