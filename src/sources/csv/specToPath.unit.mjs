import test from 'ava';
import path from 'path';
import { getPathsFromSpec, getPathsFromSpecs } from './specToPath';

// If we use .mjs, __dirname is not available
const __dirname = path.dirname(new URL(import.meta.url).pathname);

test('getPathsFromSpec: returns empty array for invalid glob', async (t) => {
	const paths = await getPathsFromSpec(path.join(__dirname, 'none'));
	t.deepEqual(paths, []);
});

test('getPathsFromSpec: returns correct array for valid glob', async (t) => {
	const paths = await getPathsFromSpec(path.join(__dirname, '**/test-*/*.csv'));
	t.deepEqual(paths, [
		path.join(__dirname, 'test-data/invalid-test.csv'),
		path.join(__dirname, 'test-data/test1.csv'),
		path.join(__dirname, 'test-data/test2.csv'),
	]);
});

test('getPathsFromSpec: returns empty array for invalid globs', async (t) => {
	const paths = await getPathsFromSpecs([path.join(__dirname, '**/*.x')]);
	t.deepEqual(paths, []);
});

test('getPathsFromSpec: returns correct array for valid globs', async (t) => {
	const paths = await getPathsFromSpecs([
		path.join(__dirname, '**/i*.csv'),
		path.join(__dirname, '*.csx'),
		path.join(__dirname, '**/*.txt'),
	]);
	t.deepEqual(paths, [
		path.join(__dirname, 'test-data/invalid-test.csv'),
		path.join(__dirname, 'test-data/non-csv.txt'), 
	]);
});