import test from 'ava';
import BacktestInstanceRunner from './BacktestInstanceRunner';

test('tests parameters', (t) => {
	const instruments = { run: () => {} };
	const runnerFn = () => {};
	const accounts = {
		set: () => {},
		add: () => {},
	};

	t.throws(() => new BacktestInstanceRunner(), /First argument/);
	t.throws(() => new BacktestInstanceRunner(instruments), /Second argument/);
	t.throws(() => new BacktestInstanceRunner(instruments, runnerFn), /Third argument/);
	t.notThrows(() => new BacktestInstanceRunner(instruments, runnerFn, accounts));
	t.throws(() => new BacktestInstanceRunner(instruments, runnerFn, accounts, 'no'), /Fourth/);
});