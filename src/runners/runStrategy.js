let orders = [];
const account = {};

/**
* Takes runners and instruments and runs backtests on it – is executed when backtest.run() is
* called by the user. Uses values returned by run() and config provided by the backtest.
* @param {function} runnerFunction				Strategy (runThrough or rejectOnFalse)
* @param {BacktestInstruments} instruments		Instruments to perform backtest with
* @param {string} name							Name of the run (e.g. 'base' and 'meta' if you
*												run a meta strategy on top of a base strategy)
* @param {Map} config							Config to run the backtest with. May contain keys:
*												- accountValue
*												- …
* @param {function} executeOrders				Pre-configured function to execute orders
*/
export default async function run(runnerFunction, instruments, name, executeOrders) {
	instruments.on('close', (data) => handleClose(runnerFunction, data));
	instruments.on('open', (data) => executeOrders(orders, data, instruments));
	await instruments.run();
	return account;
}

/**
* Handles a close event
*/
function handleClose(runnerFunction, data) {
	// Orders must be first as it will be updated and returned (only first argument is returned 
	// by runAlgorithms)
	orders = runnerFunction.onClose(orders, data.instrument, data.data, account);
	console.log('orders', orders);
	// Check orders on open
}

/**
* @param {object} eventData		Data emitted by instruments on 'open' event
*/
/*function handleOpen(eventData, backtestInstance) {
	executeOrders(eventData)
	if (!orders.length) return;
	if (orders.length) {
		console.log('has order', eventData, config, backtestInstance);
	}
}*/