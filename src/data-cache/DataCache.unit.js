import test from 'ava';
import DataCache from './DataCache';

test('fails if fields are missing', (t) => {
	const dc = new DataCache();
	t.throws(() => dc.add({ instrument: 'XRP' }), /date/);
	t.throws(() => dc.add({ date: new Date(2017, 0, 1) }), /instrument/);
	t.throws(() => dc.add({ date: 1421, instrument: 'USDCHF' }), /Date/);
	t.pass();
});

test('adds and returns data', (t) => {
	const dc = new DataCache();
	const row = { instrument: 'USD', date: new Date(2010, 0, 1), open: 5, close: 3 };
	dc.add(row);
	t.is(dc.data.length, 1);
	t.is(dc.data[0], row);
});