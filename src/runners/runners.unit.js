import test from 'ava';
import { runThrough, rejectOnFalse } from './runners';
import setupTestData from './setupTestData';

test('executes as expected', async (t) => {
	const { Algorithm, FalseAlgorithm, AsyncAlgorithm, base } = setupTestData();
	// First algo returns false – continue
	const result = runThrough(
		new FalseAlgorithm(), 
		new AsyncAlgorithm('test1', 4), 
		new Algorithm('test2', 3),
	);
	t.is(typeof result.onClose, 'function');
	const finalResult = await result.onClose(base, 2);
	// test1: 4 + 2 + 1 (from Algorithm that counts previous results up)
	// test2: 3 + 2
	const expectedResult = { test1: 7, test2: 5 };
	t.deepEqual(base, {});
	t.deepEqual(finalResult, expectedResult);
});

test('if last param is true, halts and returns false on FalseAlgorithm', async (t) => {
	const { Algorithm, FalseAlgorithm, AsyncAlgorithm, base } = setupTestData();
	const result = rejectOnFalse(
		new AsyncAlgorithm('test1', 4), 
		new Algorithm('test2', 3),
		new FalseAlgorithm(),
	);
	t.is(typeof result.onClose, 'function');
	const finalResult = await result.onClose(base, 2);
	// As last algo returns false, base should not be changed
	t.is(finalResult, false);
});

test('runThrough and rejectOnFalse be chained', async (t) => {	
	const { Algorithm, base } = setupTestData();
	const result = runThrough(
		rejectOnFalse(runThrough(new Algorithm('test1', 1))),
		runThrough(rejectOnFalse(new Algorithm('test2', 2))),
	);
	const finalResult = await result.onClose(base, 2);
	t.deepEqual(base, {});
	t.deepEqual(finalResult, {test1: 4, test2: 4});	
});