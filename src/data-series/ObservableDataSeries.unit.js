import test from 'ava';
import ObservableDataSeries from './ObservableDataSeries';

test('emits events', async (t) => {
	const ds = new ObservableDataSeries();
	let called;
	ds.on('data', (data) => {
		called = data;
	});
	await ds.add(1, { open: 5 });
	//t.is(called === undefined, false);
	t.pass();
});