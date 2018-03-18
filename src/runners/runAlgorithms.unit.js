import test from 'ava';
import runAlgorithms from './runAlgorithms';
import setupTestData from './setupTestData';

test('throws if params are not valid', async (t) => {
	// Params: Missing
	const err1 = await t.throws(runAlgorithms());
	t.is(err1.message.indexOf('array of parameters') > -1, true);
	// Params: Not an array
	const err2 = await t.throws(runAlgorithms('notanarray'));
	t.is(err2.message.indexOf('array of parameters') > -1, true);
	// Algos: Missing
	const err3 = await t.throws(runAlgorithms([]));
	t.is(err3.message.indexOf('array of algorithms') > -1, true);
	// Algos: Not an array
	const err4 = await t.throws(runAlgorithms([], 'notanarray'));
	t.is(err4.message.indexOf('array of algorithms') > -1, true);
	// Method name: Missing
	const err5 = await t.throws(runAlgorithms([], []));
	t.is(err5.message.indexOf('method name') > -1, true);
	// Method name: Not a string
	const err6 = await t.throws(runAlgorithms([], []));
	t.is(err6.message.indexOf('method name') > -1, true);
});

test('throws if algorithms are not valid', async (t) => {
	const err1 = await t.throws(runAlgorithms([], [false], 'onClose'));
	t.is(err1.message.indexOf('onClose() method') > -1, true);
	const err2 = await t.throws(runAlgorithms([], [{ onClose: false }], 'onClose'));
	t.is(err2.message.indexOf('onClose() method') > -1, true);
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

