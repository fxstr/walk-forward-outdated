import test from 'ava';
import Backtest from './Backtest';

test('accepts data source', (t) => {
	const bt = new Backtest();
	t.pass();
});