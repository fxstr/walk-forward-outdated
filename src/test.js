import Backtest, { 
	runParallel, 
	TransformableDataSeries,
} from './src/backtest/Backtest';
import CSVReader from './src/csv-reader/CSVReader';
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
	*/
	next(bar, instrument, orders) {
		if (bar[this.fastSmaKey] > bar[this.slowSmaKey]) {
			orders.add(bar.instrument);
		}
	}
}



/**
* Divides available amount equally between all orders. If amount available (backtest.account.cash)
* is $10k and 4 orders are open, each position will be allocated $2.5k.
*/
class EqualPositionSize extends Algorithm {
	next(bar, instrument, orders) {
		orders.forEach((order) => {
			order.setSize(this.account.cash / orders.length / 
				order.instrument.head()[0]('open'));
		});
	}

}


class Algorithm {}



// Monthly rebalanncing
class RunMonthly extends Algorithm {
	next(bar) {
		// Return false if latestDate was not set (first call); else return true on month change
		const monthChange = this.latestDate && bar.date.getMonth() !== this.latestDate.getMonth();
		this.latestDate = bar.date;
		// If false is returned, strategy is halted; else it continues
		return monthChange;
	}
}


// Algorithm class provides:
// - positions
// - account
class RebalancePositions extends Algorithm {
	// Add every existing position to orders so that it can be rebalanced
	next(bar, orders) {
		this.positions.forEach((position) => {
			orders.add(position.symbol);
		});
		return true;
	}
}








// Dummy code for serial

class TargetPositions {}
class OrderTransformer {}

function runSerial(strategies, data) {
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




(async () => {

	// Has stream, accounts, optimizations
	const backtest = new Backtest();
	
	backtest.setDataSource(new CSVReader(['*-eod.csv']));

	backtest.addOptimization('slowSMA', [5, 20]);
	backtest.addOptimization('fastSMA', [20, 100]);

	// Adds transformers to all results
	backtest.addResultTransformers('total', new SMA(50));

	backtest.setConfiguration({
		commission: (order) => order.size * order.instrument.head()[0].open * 0.01,
	});

	backtest.setStrategies((values) => {

		const baseStrategy = runParallel([
			runSerial(
				new RunMonthly(),
				new RebalancePositions(),
				new EqualPositionSize(),
			),
			runSerial(
				new SMAAlgo('close', values('fastSMA'), values('slowSMA')),
				new EqualPositionSize(),
			)],
			backtest.getInstruments(),
		);

		const metaStrategy = runSerial([
				new SMAAlgo({ slowSMA: 5, fastSMA: 20 }),
				new EqualPositionSize(),
			], 
			baseStrategy
		);

		metaStrategy.addTransformer('total', new SMA(100));

		return [baseStrategy, metaStrategy];

	});

	// Reads from stream and runs one stream per optimization.
	await backtest.run(new Date(2010, 0, 1));

	// Writes JSON for all instruments (setStream) and result1/2 (setResults) to file system
	await backtest.save('./data');

})();

