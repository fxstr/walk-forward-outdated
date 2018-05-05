import test from 'ava';
import calculatePositionValue from './calculatePositionValue';

test('calculatePositionValue calculates position value', (t) => {
	// Long
	t.is(calculatePositionValue(10, 5, 2), 20);
	// Size 0
	t.is(calculatePositionValue(0, 5, 2), 0);
	// Short winning
	t.is(calculatePositionValue(0, 5, -2), 20);
	// Short losing
	t.is(calculatePositionValue(10, 5, -2), 0);
	t.is(calculatePositionValue(20, 17, -2), 28);
	// Short money issues
	t.is(calculatePositionValue(15, 5, -2), -10);
});