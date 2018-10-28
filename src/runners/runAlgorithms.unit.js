import test from 'ava';
import runAlgorithms from './runAlgorithms';
import setupTestData from './setupTestData';

test('throws if params are not valid', async (t) => {
	// Params: Missing
	t.throwsAsync(() => runAlgorithms(), /array of parameters/);
	// Params: Not an array
	await t.throwsAsync(() => runAlgorithms('notanarray'), /array of parameters/);
	// Algos: Missing
	await t.throwsAsync(() => runAlgorithms([]), /array of algorithms/);
	// Algos: Not an array
	await t.throwsAsync(() => runAlgorithms([], 'notanarray'), /array of algorithms/);
	// Method name: Missing
	await t.throwsAsync(() => runAlgorithms([], []), /method name/);
	// Method name: Not a string
	await t.throwsAsync(() => runAlgorithms([], []), /method name/);
});

test('throws if algorithms are not valid', async (t) => {
	await t.throwsAsync(() => runAlgorithms([], [false], 'onClose'), /onClose\(\) method/);
	// Property present but not a function
	await t.throwsAsync(
		() => runAlgorithms([], [{ onClose: false }], 'onClose'),
		/onClose\(\) method/
	);
});

test('executes callbacks', async (t) => {
	const { Algorithm, base } = setupTestData();
	const result = await runAlgorithms(
		[base, 3], 
		[new Algorithm('name1', 2), new Algorithm('name2', 5)], 
		'onClose',
	);
	// Base is unchanged (algos return a different value but do not change arguments)
	t.deepEqual(base, {});
	// name 1: 3+2+1 (1 from onClose run), name2: 5+3
	t.deepEqual(result, { name1: 6, name2: 8});
});

test('awaits async callbacks', async (t) => {
	const { Algorithm, AsyncAlgorithm, base } = setupTestData();
	// Run async algorithm first to see if we're waiting for it to complete.
	const result = await runAlgorithms(
		[base, 3], 
		[new AsyncAlgorithm('name1', 2), new Algorithm('name2', 5)], 
		'onClose',
	);
	t.deepEqual(base, {});
	t.deepEqual(result, { name1: 6, name2: 8});
});

test('doesn\'t halt if haltOnFalse is not set even though onClose() returns false', async (t) => {
	const { Algorithm, FalseAlgorithm, base } = setupTestData();
	// Run async algorithm first to see if we're waiting for it to complete.
	const result = await runAlgorithms(
		[base, 3], 
		[new FalseAlgorithm(), new Algorithm('name2', 5)], 
		'onClose',
	);
	// return value corresponds to first argument
	t.deepEqual(result, { name2: 8 });
});

test('halts if onClose() returns false if haltOnFalse is set', async (t) => {
	const { Algorithm, FalseAlgorithm, base } = setupTestData();
	// Run async algorithm first to see if we're waiting for it to complete.
	const result = await runAlgorithms(
		[base, 3], 
		[new FalseAlgorithm(), new Algorithm('name2', 5)],
		'onClose',
		true
	);
	t.is(result, false);
});

