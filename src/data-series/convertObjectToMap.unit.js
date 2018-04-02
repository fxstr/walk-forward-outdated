import test from 'ava';
import convertObjectToMap from './convertObjectToMap';

test('fails on invalid param', (t) => {
	t.throws(() => convertObjectToMap(null), /an object/);
	t.throws(() => convertObjectToMap('string'), /an object/);
});

test('converts empty object', (t) => {
	t.deepEqual(convertObjectToMap({}), new Map());	
});

test('converts object with regular and symbol keys', (t) => {
	const sym = Symbol();
	const obj = {
		[sym]: 1,
		'name': 2,
	}
	const map = convertObjectToMap(obj);
	t.is(map.size, 2);
	t.is(map.get(sym), 1);
	t.is(map.get('name'), 2);
});