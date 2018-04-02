import test from 'ava';
import { SMA } from './indicators';
import origSMA from './SMA';

test('', (t) => {
	t.is(SMA, origSMA);
});