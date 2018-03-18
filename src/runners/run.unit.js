import test from 'ava';
import run from './run';

test('returns params as an array', (t) => {
	const params = run(1, 2, 3);
	t.deepEqual(params, [1, 2, 3]);
});