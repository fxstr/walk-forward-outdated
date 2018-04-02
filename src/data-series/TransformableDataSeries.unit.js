import test from 'ava';
import TransformableDataSeries from './TransformableDataSeries';



//////////////////// ADD DATA

test('add returns promise', async (t) => {
	const ds = new TransformableDataSeries();
	const promise = ds.add(1, { col: 'value' });
	t.is(promise instanceof Promise, true);
	await promise;
});

test('does not change original data', async (t) => {
	const ds = new TransformableDataSeries();
	const data = { col: 'value' };
	const originalData = { ...data };
	await ds.add(1, data);
	t.deepEqual(originalData, data);
});


//////////////////// SET DATA

test('set returns a promise', async (t) => {
	const ds = new TransformableDataSeries();
	ds.add(1, { col: 'value1' });
	const promise = ds.set({ newCol: 'value2' });
	t.is(promise instanceof Promise, true);
	await promise;
});

test('does not change original data', async (t) => {
	const ds = new TransformableDataSeries();
	ds.add(1, { col: 'value1' });
	const data = { newCol: 'value2' };
	const originalData = { ...data };
	await ds.set(data);
	t.deepEqual(originalData, data);
});




//////////////////// ADD TRANSFORMERS

test('fails if properties are invalid', (t) => {
	const ds = new TransformableDataSeries();
	t.throws(() => ds.addTransformer('notanarray'), /array/);
});

test('addTransformer: fails if transformer is not an object of next method is missing', (t) => {
	const ds = new TransformableDataSeries();
	// Not an object
	t.throws(() => ds.addTransformer([], 'test'), /object/);
	// Next method missing
	class BadTransformer {
		// Method «next» missing
	}
	t.throws(() => ds.addTransformer(new BadTransformer()));
});

test('addTransformer adds transformer and returns a map with symbols', (t) => {
	const ds = new TransformableDataSeries();
	class GoodTransformer {
		next() {
			return 1;
		}
	}
	const goodInstance = new GoodTransformer();
	ds.addTransformer([], goodInstance);
	t.is(ds.transformers.length, 1);
	// Creates transformer with properties, transformer and keys
	t.deepEqual(ds.transformers[0].properties, []);
	t.is(ds.transformers[0].transformer, goodInstance);
	t.is(typeof ds.transformers[0].keys.get('value'), 'symbol');
});




//////////////////// ALL PROPERTIES AVAILABLE

test ('allPropertiesAvailable fails if no rows are available', (t) => {
	const ds = new TransformableDataSeries();
	t.throws(() => ds.allPropertiesAvailable(['test']), /no row/);
});

test('allPropertiesAvailable fails if something else than an array is passed', (t) => {
	const ds = new TransformableDataSeries();
	ds.add(1, { col1: 'val1' });
	t.throws(() => ds.allPropertiesAvailable('test'), /array/);
});

test('allPropertiesAvailable returns correct values', async (t) => {
	t.throws(() => ds.allPropertiesAvailable(['test']));
	const ds = new TransformableDataSeries();
	const sym = Symbol();
	const data1 = new Map([
		['col1', 'val1'],
		['col2', 'val2'],
		[sym, 'val3'],
	]);
	await ds.add(1, data1);
	t.is(ds.allPropertiesAvailable(['test']), false);
	t.is(ds.allPropertiesAvailable([sym, 'test']), false);
	const result = ['val3', 'val1'];
	t.deepEqual(ds.allPropertiesAvailable([sym, 'col1']), result);
});





//////////////////// TRANSFORMS DATA

function generateTransformers() {
	// Adds this.summand to the keys passed in
	class AdditionTransformer {
		constructor(summand) {
			this.summand = summand;
		}
		next(data) {
			// Sums up all key values and adds this.summand
			return data.reduce((prev, val) => prev + val, this.summand);
		}
	}
	// Adds this.summand to the keys passed in (asynchronously)
	class AsyncAdditionTransformer {
		constructor(summand, time) {
			this.time = time;
			this.summand = summand;
		}
		async next(data) {
			await new Promise((resolve) => setTimeout(resolve, 5));
			return data.reduce((prev, val) => prev + val, this.summand);
		}
	}
	// Returns one col for every summand passed to constructor, called add{summand} and with
	// a value of summand + (row keys passed)
	class MultiAdditionTransformer {
		constructor(summands) {
			this.summands = summands;
		}
		next(data) {
			return this.summands.reduce((prev, item) => {
				prev.set('add' + item, data[0] + item);
				return prev;
			}, new Map());
		}
		getKeys() {
			return this.summands.map((summand) => 'add' + summand);
		}
	}
	// Adds up all passed dependencies into one value (string!)
	class MultipleIntoOneTransformer {
		next(data) {
			return data.reduce((prev, val) => prev + val, '');
		}
	}
	return { 
		AdditionTransformer, 
		AsyncAdditionTransformer, 
		MultiAdditionTransformer, 
		MultipleIntoOneTransformer,
	};
}


test('calls transformer\'s next method with correct parameters', async (t) => {
	const allParams = [];
	const ds = new TransformableDataSeries();
	class Transformer {
		next(...params) {
			allParams.push(params);
			return 0;
		}
	}
	ds.addTransformer(['open', 'close'], new Transformer());
	await ds.add(1, { open: 2, close: 4 });
	await ds.add(1, { close: 5, open: 3 });
	// Called once per row
	t.deepEqual(allParams, [[[2, 4]], [[3, 5]]]);
});


test('executes a transformer without dependencies before data is added', async (t) => {
	const ds = new TransformableDataSeries();	
	class Transformer {
		next() {
			// Transformer should be executed before data is added; head row's size should 
			// therefore be 0
			t.is(ds.head().size, 0);
			return 0;
		}
	}
	ds.addTransformer([], new Transformer());
	await ds.add(1, { open: 2 });
	t.is(ds.head().size, 2);
});


test('works with transformers that return a single value', async (t) => {
	const { AdditionTransformer } = generateTransformers();
	const ds = new TransformableDataSeries();
	const { value } = ds.addTransformer(['open'], new AdditionTransformer(5));
	await ds.add(1, { open: 2, close: 3 });
	t.is(ds.data.length, 1);
	t.is(ds.head().get(value), 7);
});


test('works with transformers that return an map', async (t) => {
	const ds = new TransformableDataSeries();
	const { MultiAdditionTransformer } = generateTransformers();
	const keys = ds.addTransformer(['open'], new MultiAdditionTransformer([1, 2, 3]));
	await ds.add(1, { open: 3 });
	t.is(ds.head().get(keys.add1), 4);
	t.is(ds.head().get(keys.add2), 5);
	t.is(ds.head().get(keys.add3), 6);
});


test('multiple transformers work in the expected order', async (t) => {
	const ds = new TransformableDataSeries();
	const { AsyncAdditionTransformer, AdditionTransformer } = generateTransformers();
	const firstKey = ds.addTransformer(['open'], new AsyncAdditionTransformer(5, 10)).value;
	const secondKey = ds.addTransformer([firstKey], new AsyncAdditionTransformer(5, 20)).value;
	const thirdKey = ds.addTransformer([secondKey], new AdditionTransformer(2)).value;
	const fourthKey = ds.addTransformer(['open'], new AdditionTransformer(7)).value;
	await ds.add(1, { open: 2, close: 3 });
	t.is(ds.data.length, 1);
	t.is(ds.head().get(firstKey), 7);
	t.is(ds.head().get(secondKey), 12);
	t.is(ds.head().get(thirdKey), 14);
	t.is(ds.head().get(fourthKey), 9);
});


test('works with multiple input values', async (t) => {
	const ds = new TransformableDataSeries();
	const { MultipleIntoOneTransformer } = generateTransformers();
	const { value } = ds.addTransformer(['open', 'close', 'high'], 
		new MultipleIntoOneTransformer());
	await ds.add(1, { open: 3, high: 6, low: 1, close: 2 });
	t.is(ds.head().get(value), '326');
});


test('has helpful error messages if getKeys() returns too many keys', async (t) => {
	class TooManyKeys {
		next() {
			return new Map([['a', 1]]);
		}
		getKeys() {
			return ['a', 'b'];
		}
	}
	const ds = new TransformableDataSeries();
	ds.addTransformer(['open'], new TooManyKeys());
	const err = await t.throws(ds.add(1, { open: 4 }));
	t.is(err.message.indexOf('is not part of the object') > -1, true);
});


test('has helpful error messages if next() returns too many keys', async (t) => {
	class NotAllKeys {
		next() {
			return new Map([['a', 1], ['b', 2]]);
		}
		getKeys() {
			return ['a'];
		}
	}
	const ds = new TransformableDataSeries();
	ds.addTransformer(['open'], new NotAllKeys());
	const err = await t.throws(ds.add(1, { open: 4 }));
	t.is(err.message.indexOf('was not announced by getKeys') > -1, true);
});


test('transformers are called on set and add', async (t) => {
	const ds = new TransformableDataSeries();
	const { AdditionTransformer } = generateTransformers();
	const addKey = ds.addTransformer(['add'], new AdditionTransformer(3)).value;
	const setKey = ds.addTransformer(['set'], new AdditionTransformer(3)).value;
	await ds.add(1, { add: 2 });
	t.is(ds.head().get(addKey), 5);
	await ds.set({ 'set': 5 });
	t.is(ds.head().get(setKey), 8);
});


test('works with multiple rows (nested/dependent transformers)', async (t) => {
	const ds = new TransformableDataSeries();
	const { AsyncAdditionTransformer } = generateTransformers();
	const key1 = ds.addTransformer(['open'], new AsyncAdditionTransformer(5, 20)).value;
	const key2 = ds.addTransformer([key1], new AsyncAdditionTransformer(3, 10)).value;
	await ds.add(1, { open: 2 });
	t.is(ds.head().get(key2), 10);
	await (ds.add(2, { open: 3 }));
	await (ds.add(2, { open: 5 }));
	t.is(ds.head().get(key2), 13);
});



