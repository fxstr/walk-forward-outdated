import test from 'ava';
import Instrument from './Instrument';

test('creates instrument', (t) => {
	t.throws(() => new Instrument(), /first argument/);
	const instrument = new Instrument('test');
	t.is(instrument.name, 'test');
});

test('adds to data series', async (t) => {
	const instrument = new Instrument('test');
	const result = instrument.addData(new Date(2010, 0, 1), { empty: true });
	t.is(result instanceof Promise, true);
	await result;
});