import Backtest, { 
	run, 
	rejectOnFalse,
	runThrough, 
	TransformableDataSeries,
	instrumentType,
} from './src/backtest/Backtest';
import BacktestCSVSource from './src/csv-reader/CSVReader';
import SMA from './src/indicators/SMA';



// Backtest exposes:
// - account
// - (orders)
// - positions
// - instruments





/**
* Buy instruments when fast SMA crosses the slow SMA.slowSmaKey.
* @param {integer} fastSma		Period for the fast SMA
* @param {integer} slowSma		Period for the slow SMA
*/
class SMAAlgo extends Algorithm {
	constructor(field, fastSma, slowSma) {
		super();
		this.field = field;
		this.fastSma = fastSma;
		this.slowSma = slowSma;
	}

	/**
	* afterInstrumentAdded is always called after an instrument was initialized and added to the
	* backtest. This is the place to add transformers to any instrument. 
	*/
	instrumentAdded(instrument) {
		this.slowSMAKey = instrument.addTransformer([this.field], new SMA(this.fastSma));
		this.fastSMAKey = instrument.addTransformer([this.field], new SMA(this.slowSma));
	}

	/**
	* afterInstrumentBarClosed is called whenever any instrument gets new close data (which
	* includes lows and highs). This is the place to build your orders. 
	* @param {TransformableDataSeries} instrument
	* @param {array} orders
	*/
	onClose(orders, instrument) {
		if (instrument.head()[this.fastSmaKey] > instrument.head()[this.slowSmaKey]) {
			orders.push(instrument);
		}
		return orders;
	}
}



/**
* Divides available amount equally between all orders. If amount available (backtest.account.cash)
* is $10k and 4 orders are open, each position will be allocated $2.5k.
*/
class EqualPositionSize extends Algorithm {
	// backtest: 
	// backtest.account
	// backtest.positions
	onClose(orders, data, instrument, backtest) {
		orders.forEach((order) => {
			order.size = backtest.account.cash / orders.length / order.instrument.head()['open'];
		});
		return orders;
	}

}


class Algorithm {}



// Monthly rebalanncing
class RunMonthly extends Algorithm {
	onClose(orders, instrument) {
		// Return false if latestDate was not set (first call); else return true on month change
		const now = instrument.head().date;
		const monthChange = !this.latestDate || now.getMonth() !== this.latestDate.getMonth();
		this.latestDate = now;
		// If false is returned, strategy is halted; else it continues
		return monthChange ? orders : false;
	}
}


// Algorithm class provides:
// - positions
// - account
class RebalancePositions extends Algorithm {
	// Add every existing position to orders so that it can be rebalanced
	next(orders, instrument, backtest) {
		backtest.positions.forEach((position) => {
			orders.push({ instrument: position.instrument });
		});
		return orders;
	}
}








// Dummy code for serial

class TargetPositions {}
class OrderTransformer {}

function serial(strategies, data) {
	const result = new TransformableDataSeries();
	const targetPositions = new TargetPositions();
	
	strategies.forEach((strategy) => {
		strategy.setResult(result);
		strategy.setData(data);
	});

	// We need to rewrite the transformers: halt on «return false», 
	data.forEach((datum) => {
		datum.on('data', (item) => {
			const result = strategy.next(item, targetPositions);
			if (!result) return;
			else callNextStrategy();
		});
	});

	function callNextStrategy() {
		// At the end:
		data.addTransformer(new OrderTransformer(targetPositions));
	}
	return result;
}


class Sum {}



(async () => {

	// Has stream, accounts, optimizations
	const backtest = new Backtest();
	
	// First param: Use file name (without .csv ending) as the instrument's name
	// Second param: Read all files in the current folder that end with "-eod.csv"
	backtest.setDataSource(new BacktestCSVSource((name) => name.substr(0, -4), ['*-eod.csv']));

	// name, [from, to], steps; backtest will be run with 100 variations
	backtest.addOptimization('slowSMA', [5, 20], 10);
	backtest.addOptimization('fastSMA', [20, 100], 10);

	backtest.setInstrumentConfiguration({
		AAPL: {
			type: instrumentType.stock,
			margin: 0.5
		}
	});

	backtest.setConfiguration({
		// $1 per instrument traded
		commission: (order) => order.size * 1,
		slippage: (order) => order.size * order.instrument.head()[0].open * 0.01,
	});

	backtest.setStrategies((params) => {
		return runThrough(
			// Use a simple SMA strategy; buy instruments for the same amount
			rejectOnFalse(
				new RunMonthly(),
				// Before buying new instruments, reduce the amount of the ones you're holding
				new RebalancePositions(),
				new EqualPositionSize(),
			),
			// Rebalance the open positions every month
			rejectOnFalse(
				new SMAAlgo('close', params('fastSMA'), params('slowSMA')),
				new EqualPositionSize(),
			),
		);
	});

	// Reads from stream and runs one stream per optimization; accepts start and end date
	await backtest.run(new Date(2010, 0, 1));

	// Writes JSON for all instruments (setStream) and result1/2 (setResults) to file system
	// True for zip/folder (?)
	await backtest.save('./data', true);

})();

