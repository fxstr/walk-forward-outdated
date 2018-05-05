import test from 'ava';
import { SMA } from './indicators';
import origSMA from './SMA';

test('exports are correct', (t) => {
	t.is(SMA, origSMA);
});