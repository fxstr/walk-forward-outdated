function run(runners, instruments) {
	console.log('h is %o', h);
	console.log('run with %o %o', runners, instruments);
	return 'dataseries';
}

class Holder {
	functions = [];
	addFunction(fn) {
		this.functions.push(fn);
	}
	call() {
		this.functions.forEach((fn) => fn(1, 2, 3));
	}
}

const h = new Holder();
h.addFunction((...params) => {
	console.log('function 1 called with params %o', params);
	const runResult = run('myRunners', 'myInstruments');
	return [runResult];
});

const res = h.call();
console.log('final result is %o', res);