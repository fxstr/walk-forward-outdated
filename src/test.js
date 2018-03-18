import Backtest, { 
	run, 
	parallel, 
	TransformableDataSeries,
	serial,
	InstrumentType,
} from './src/backtest/Backtest';
import BacktestCSVSource from './src/csv-reader/CSVReader';
import SMA from './src/indicators/SMA';



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
				order.instrument.head().open);
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





(async () => {

	const backtest = new Backtest();
	backtest.setDataSource(new BacktestCSVSource(['data/*.csv']));

	//backtest.addOptimization('fastSMA', [5, 20], 4);
	backtest.setParameter('fastSma', 20);

	// Use callback so that we can inject params later without changing the API much.
	backtest.setStrategies((instruments, params) => {

		run(
			serial(
				// Rebalance the open positions every month
				serial(
					new RunMonthly(),
					new RebalancePositions(),
					new EqualPositionSize(),
					true,
				),
				// Use a simple SMA strategy; buy instruments for the same amount
				serial(
					new SMAAlgo('close', params.fastSMA, 20),
					new EqualPositionSize(),
					true,
				),
			),
			instruments,
		);

	});

	// Reads from stream and runs one stream per optimization; accepts start and end date
	await backtest.run();

	// Writes JSON for all instruments (setStream) and result1/2 (setResults) to file system
	await backtest.save('./data');

})();

