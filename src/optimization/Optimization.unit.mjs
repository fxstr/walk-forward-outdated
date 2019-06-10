import test from 'ava';
import Optimization from './Optimization';

test('parameter examination', (t) => {
	const opt = new Optimization();
	t.throws(() => opt.addParameter(), /First parameter/);
	t.throws(() => opt.addParameter(5), /First parameter/);
	t.throws(() => opt.addParameter('name'), /Second parameter/);
	t.throws(() => opt.addParameter('name', []), /Second parameter/);
	t.throws(() => opt.addParameter('name', [5]), /Second parameter/);
	t.throws(() => opt.addParameter('name', [5, 2]), /Second parameter/);
	t.throws(() => opt.addParameter('name', [5, 6], 'bad param'), /Third parameter/);
	t.throws(() => opt.addParameter('name', [5, 6], 5, 'bad param'), /Fourth parameter/);
	t.notThrows(() => opt.addParameter('name', [5, 6], 5));
});

test('adds parameter configs', (t) => {
	const opt = new Optimization();
	opt.addParameter('name', [5, 6], 5, 'log', { base: 5 });
	t.is(opt.parameterConfigs.size, 1);
	t.deepEqual(opt.parameterConfigs.get('name'), {
		bounds: [5, 6],
		steps: 5,
		type: 'log',
		config: { base: 5 },
	});
});

test('generates correct configs', (t) => {
	const opt = new Optimization();
	opt.addParameter('fast', [2, 8], 3, 'log', { logBase: 2 });
	opt.addParameter('slow', [8, 16], 2, 'log', { logBase: 2 });
	const paramSets = opt.generateParameterSets();
	t.is(paramSets.length, 6);
	t.deepEqual(paramSets[0], new Map([['fast', 2], ['slow', 8]]));
	// Calculations are covered in generateParameters, no tests needed
	t.deepEqual(paramSets[5], new Map([['fast', 8], ['slow', 16]]));
});