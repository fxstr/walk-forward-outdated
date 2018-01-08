// Polyfill is needed for async generators, see
// https://github.com/babel/babel/issues/4639

import test from 'ava';
import DataGenerator from './DataGenerator';

function setupData() {
	const cache = { data: [1, 2, 3, 4] };
	const emptySource = new class {
		read() { return Promise.resolve(false); }
	};
	// Source that adds two more rows to cache, then returns false
	const validSource = new class {
		readCount = 0;
		read() {
			if (this.readCount > 1) return Promise.resolve(false);
			return new Promise((resolve) => {
				cache.data.push(this.readCount + 5);
				this.readCount++;
				// Resolve with undefined; generator should only halt on false
				resolve(); 
			});
		}
	};
	return { cache, emptySource, validSource };
}


test('fails with invalid arguments', (t) => {
	// Invalid cache
	t.throws(() => new DataGenerator(), /First argument/);
	t.throws(() => new DataGenerator({}), /First argument/);
	t.throws(() => new DataGenerator({ data: '' }), /First argument/);
	// Invalid source
	t.throws(() => new DataGenerator({ data: [] }, {} ), /Second argument/);
	t.notThrows(() => new DataGenerator({ data: [] }, { read: () => {} }), /Second argument/);
	// Invalid sort function
	t.throws(() => new DataGenerator({ data: [] }, { read: () => {} }, ''), /Third argument/);
	t.notThrows(() => new DataGenerator({ data: [] }, { read: () => {} }, () => {} ), 
		/Third argument/);
});


test('reads from cache', async (t) => {
	const { cache, emptySource } = setupData();
	const dg = new DataGenerator(cache, emptySource);
	const result = [];
	for await (const row of dg.generateData()) {
		result.push(row);
	}
	t.deepEqual(result, cache.data);
});


test('reads from cache, then from source', async (t) => {
	const { cache, validSource } = setupData();
	const dg = new DataGenerator(cache, validSource);
	const result = [];
	for await (const row of dg.generateData()) {
		result.push(row);
	}
	t.deepEqual(result, [1, 2, 3, 4, 5, 6]);
});


test('reads data by sort function passed', async (t) => {
	const { cache, validSource } = setupData();
	const dg = new DataGenerator(cache, validSource, (a, b) => {
		return b - a;
	});
	const result = [];
	for await (const row of dg.generateData()) {
		result.push(row);
	}
	// As newly added entries will be pushed to the front, the last entry will always be 1 
	// as soon as we read from the source.
	t.deepEqual(result, [4, 3, 2, 1, 1, 1]);
});
