// Polyfill is needed for async generators, see
// https://github.com/babel/babel/issues/4639

import test from 'ava';
import DataGenerator from './DataGenerator';

function setupData() {
	// Undefined: Make sure generator only halts on false, not undefined/null
	const emptySource = new class {
		read() { return Promise.resolve(false); }
	};
	// Source that adds two more rows to cache, then returns false
	let readCounter = { count: 0 };
	const validSource = new class {
		// Undefined: Make sure we don't halt, but only on false
		data = [1, 2, undefined]
		readCount = 0;
		read() {
			readCounter.count++;
			if (this.readCount >= this.data.length) return Promise.resolve(false);
			return new Promise((resolve) => {
				resolve(this.data[this.readCount]);
				this.readCount++;
			});
		}
	};
	return { emptySource, validSource, readCounter };
}


test('fails with invalid arguments', (t) => {
	// Invalid source
	t.throws(() => new DataGenerator({} ), /First argument/);
	t.notThrows(() => new DataGenerator({ read: () => {} }), /First argument/);
	// Invalid sort function
	t.throws(() => new DataGenerator({ read: () => {} }, ''), /Second argument/);
	t.notThrows(() => new DataGenerator({ read: () => {} }, () => {} ), 
		/Second argument/);
});


test('returns correct results and fills cache with them', async (t) => {
	const { validSource } = setupData();
	const dg = new DataGenerator(validSource);
	const result = [];
	for await (const row of dg.generateData()) {
		console.warn(row);
		result.push(row);
	}
	t.deepEqual(result, [1, 2, undefined]);
	t.deepEqual(result, dg.cache);
});


test('once through, reads data from cache', async (t) => {
	const { validSource, readCounter } = setupData();
	const dg = new DataGenerator(validSource);
	const result = [];
	for await (const row of dg.generateData()) {
	}
	t.is(readCounter.count, 4);
	// Second loop: All data should come from cache, readCount should not go up
	for await (const row of dg.generateData()) {
	}
	// Make one more call to see if there's more data
	t.is(readCounter.count, 5);
});


test('reads data by sort function passed', async (t) => {
	const { validSource } = setupData();
	const dg = new DataGenerator(validSource, (a, b) => {
		return b - a;
	});
	const result = [];
	for await (const row of dg.generateData()) {
		result.push(row);
	}
	// We're sorting descending; 1 will be at the end (and therefore emitted twice), before
	// undefined goes to the end
	t.deepEqual(result, [1, 1, undefined]);
});

