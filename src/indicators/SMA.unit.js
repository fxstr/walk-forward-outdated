import test from 'ava';
import SMA from './SMA';

test('throws if amount of params passed is wrong', (t) => {
	t.throws(() => new SMA(), /number/);
	t.throws(() => new SMA('invalid'), /number/);
	t.notThrows(() => new SMA(2), /number/);
});

test('throws if amount of params passed to next is wrong', async (t) => {
	const sma = new SMA(2);
	const err = await t.throws(sma.next([]));
	t.is(err.message.includes('exactly one'), true);
});

test('returns undefined if not enough data is available', async (t) => {
	const sma = new SMA(2);
	t.is(await sma.next([3]), undefined);
});

test('returns correct values if data is available', async (t) => {
	const sma = new SMA(2);
	await sma.next([3]);
	t.is(await sma.next([5]), 4);
	t.is(await sma.next([4]), 4.5);
});