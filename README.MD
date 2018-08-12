# Not ready for use, still in development

Expect a first release in autumn 2018. By then, the code and API should be in a somewhat stable mode and docs should reflect the current state. 

# Walk Forward

Walk Forward is a framework that lets you backtest your trading strategies (stocks, futures, forex, crypto currencies, …). It is completely written in JavaScript.

## Features

- Uses re-usable algorithms (signal generation, position sizing etc.) that can be freely stacked together.
- Let's you plug in any data source you like – CSVs, web services, a broker's API etc. (for now only supports CSVs out of the box.)
- Handles any instrument you wish to backtest: Futures, Stocks, Crypto Currencies, Forex etc.
- Produces standardized CSV output that can be read and displayed by any CSV-capable application (Google Spreadsheets, Microsoft Excel; a matching frontend is on the roadmap)
- Parameter optimization (with log scales)
- Written in a flexbile, heavily used and steadily improving language (yes, JavaScript), using current developments (ES6 modules, `async`/`await`)
- Used and tested (unit/integration tests) on the server side, but should also work in the frontend
- Open source (ISC license)
- Uses some of [tulip's](https://tulipindicators.org) indicators



## Example Code

### Prerequisites

1. You need [Node.js](https://nodejs.org) and [NPM](https://www.npmjs.com/get-npm).
2. Install WalkForward: `npm i -S walk-forward`
3. WalkForward uses [ES2015 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) (it's the future). In order to use them in current Node.js versions (below 10), we have to transform them to CommonJS modules. We use *babel-register* to do so: `npm i -S babel-register`

### Your Code

#### Instruments (TransformableDataSeries)

The foundation of WalkForward are `TransformableDataSeries`. They're used for instruments, positions and accounts (cash/positions etc.). 

#### Indicators


#### Algorithms

WalkForward simulates the strategy you provide based on the data you provide and outputs the corresponding statistics (basically gains and losses). The strategy is called whenever an instrument closes and is expected to return orders. Orders tell WalkForward what, when and how much to buy. A strategy can be split up into different parts (algorithms):
1. Trading signals: Should we buy now?
1. Position Sizing: If we buy, how much should we buy?
1. Risk management: Make sure we don't bet everything on one horse.

As those algorithms can by their nature be used in different strategies, WalkForward makes them re-usable and pluggable. 

A basic algorithm looks like this:

```javascript
import { SMA } from 'walk-forward-indicators';

/**
 * Buys 
 */
class SMAStrategy {

	/**
	 * onNewInstrument is called by WalkForward whenever a new instrument is discovered in the
	 * data you provide.
	 */
	onNewInstrument(instrument) {
		// instrument.addTransformer returns a Symbol() that can be used to access the transformer's
		// values when the backtest is running (see onClose method)
		this.fastSMA = instrument.addTransformer(new SMA(5));
		this.slowSMA = instrument.addTransformer(new SMA(10));
	}

	/**
	 * onClose is called by WalkForward whenever data (open/close etc.) was received for an 
	 * instrument. 
	 * It is expected to return an array of orders; every order is an object with two properties:
	 * - size (number) 
	 * - instrument (instrument)
	 * onClose is called with the following arguments: 
	 * - orders (current orders)
	 * - instrument (the instrument which received the data and the close event was fired on)
	 * - instruments (an array of all instruments)
	 * - accounts (the current account)
	 */
	onClose(orders, instrument) {
		if (
			// Current fastSMA is above current slowSMA
			instrument.head().get(this.fastSMA) > instrument.head().get(this.slowSMA) &&
			// Previous fastSMA was below or equal to previous slowSMA; this makes sure that 
			// we only buy on cross overs.
			instrument.back(1).get(this.fastSMA) <= instrument.back(1).get(this.slowSMA)
		) {
			// [...orders] clones the orders array (as you should not modify parameters passed
			// to your functions). It is then extended with the current order.
			// We use a default size of 1 which will later be modified by the position sizing
			// algorithm
			return [...orders, { instrument: instrument, size: 1 }]
		}
		// Default: Just return the existing orders. If we returned an empty array, all existing
		// orders would be canceled.
		return orders;
	}
}
```


#### Backtest

In order to run a backtest,
1. instantiate a new `Backtest()`
1. provide a data source (e.g. some CSV files)
1. write an algorithm that creates the buy signals and another algorithm that 


## Documentation

Algos and stacks

### Algos

### Backtest

`backtest.run()`

### Transformers

Instruments, results

### Instruments



## Roadmap
- [x] Parameter optimization
- [ ] Configure spread, commission and slippage depending on an order
- [ ] Output relevant display data as JSON (for formatted output in frontend)
- [ ] Interactive web frontend
- [ ] Instrument configuration (type of instrument, whole sizes, margins)
- [ ] Margin handling
- [ ] More optimization techniques (in addition to current log, e.g. linear, other log bases, integers only instead of floats)
- [ ] Relevant ouptut in form of tables (orders, positions in addition to charts)
- [ ] Better charts for parameter optimization (2D/3D visualization)
- [ ] Currency handling
- [ ] Walk forward optimization
- [ ] More data sources out of the box
- Better docs, always better docs

## Inspiration

[koa](http://koajs.com/)'s Middleware, [bt](http://pmorissette.github.io/bt/)'s reusable algos, [glulp 4](https://github.com/gulpjs/gulp/tree/4.0)'s chainable serial/parallel functions. 