import test from 'ava';
import { generateLogarithmicParameters } from './generateParameters';

test('uses golden ratio as default log base', (t) => {
	const result = generateLogarithmicParameters(5, 10, 10);
	t.is(result.length, 10);
	const goldenRatio = ((1 + Math.sqrt(5))/2).toFixed(4);
	for (let i = 2; i < result.length; i++) {
		t.is(((result[i] - result[i-1]) / (result[i-1] - result[i-2])).toFixed(4), goldenRatio);
	}
	t.is(result[0], 5);
	t.is(result.slice(-1)[0], 10);
});

test('takes a custom log base', (t) => {
	const result = generateLogarithmicParameters(5, 10, 5, 2);
	const short = result.map((item) => Number(item.toFixed(2)));
	t.deepEqual(short, [5, 5.33, 6, 7.33, 10]);
});
