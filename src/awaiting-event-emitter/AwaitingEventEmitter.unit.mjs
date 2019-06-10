import test from 'ava';
import AwaitingEventEmitter from './AwaitingEventEmitter';

function setupData() {
	const results = [];
	const callback1 = async function(data) {
		return new Promise((resolve) => {
			setTimeout(() => {
				results.push(data);
				resolve();
			}, 10);
		});
	};
	const callback2 = function(data) {
		results.push(data);
	};
	return { results, callback1, callback2 };
}

test('throws on invalid arguments for on', (t) => {
	const ee = new AwaitingEventEmitter();
	t.throws(() => ee.on(), /type/);
	t.throws(() => ee.on(true), /type/);
	t.throws(() => ee.on('test'), /callback/);
	t.throws(() => ee.on('test', 2), /callback/);
});

test('throws on invalid arguments for emit', async (t) => {
	const ee = new AwaitingEventEmitter();
	await t.throwsAsync(() => ee.emit(), /type/);
	await t.throwsAsync(() => ee.emit(true), /type/);
});

test('calls with correct data and awaits them', async (t) => {
	const ee = new AwaitingEventEmitter();
	const { results, callback1, callback2 } = setupData();
	ee.on('test', callback1);
	ee.on('test', callback2);
	const data = { isIt: true };
	await ee.emit('test', data);
	t.deepEqual(results, [data, data]);
});