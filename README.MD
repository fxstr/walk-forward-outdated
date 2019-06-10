# Walk Forward

Walk Forward is a JavaScript framework that lets you backtest your trading strategies (stocks, futures, forex, crypto currencies, …).

## Features

- Uses re-usable algorithms (signal generation, position sizing, risk management etc.) that can be freely stacked together.
- Let's you plug in any data source you like – CSVs, web services, a broker's API etc. (only supports CSVs out of the box for now)
- Handles any instrument you wish to backtest: Futures, Stocks, Crypto Currencies, Forex etc.
- Produces standardized CSV output that can be read and displayed by any CSV-capable application (Google Spreadsheets, Microsoft Excel; a matching frontend is on the roadmap)
- Parameter optimization (with log scales)
- Written in a flexbile, heavily used and steadily improving language (yes, JavaScript), using current developments (ES2015 modules, `async`/`await`)
- Used and tested (unit/integration tests) on the server side, but should also work in the frontend
- Open source (ISC license)
- Uses [tulip's](https://tulipindicators.org) indicators



## Example Code

### Prerequisites

1. You need [Node.js](https://nodejs.org) and [NPM](https://www.npmjs.com/get-npm).
2. Install WalkForward: `npm i -S walk-forward`
3. WalkForward uses [ES2015 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import), async generators and other TC39 proposals. In order to use them in current Node.js versions, we have to use Babel: `npm i -S @babel/core @babel/node`
4. Data for the instruments you intend to backtest. Use CSVs with the following structure (date, open and close fields are mandatory; all other fields will be made available to your backtesting code), put it in `data/input`folder, e.g. as `aapl.csv`:
    ```
    	date, open, high, low, close
    	2018-01-01, 13.5, 15.7, 13.3, 13.9
    ```

### Code
Create an `backtest.js` file with the following content to run a SMA strategy on the first day of every month and size all positions equally:

For now, create an `index.js` file that loads all modules: 


### Run it
Call `node .` – and see the results of your backtest in the ouptut directory you specified.


## Documentation

### Logging

To enable logs, set the log level and [components](https://github.com/visionmedia/debug) through your environment:

```bash
export DEBUG=WalkForward:*
export "DEBUG_LEVELS=debug, info, warn, error"
```

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
- [x] Output relevant display data as JSON (for formatted output in frontend)
- [x] Interactive web frontend
- [ ] Instrument configuration (type of instrument, whole sizes, margins)
- [ ] Margin handling
- [ ] More optimization techniques (in addition to current log, e.g. linear, other log bases, integers only instead of floats)
- [x] Relevant ouptut in form of tables (orders, positions in addition to charts)
- [ ] Better charts for parameter optimization (2D/3D visualization)
- [ ] Currency handling
- [ ] Walk forward optimization
- [ ] More data sources out of the box
- Better docs, always better docs

## Inspiration

[koa](http://koajs.com/)'s Middleware, [bt](http://pmorissette.github.io/bt/)'s reusable algos, [glulp 4](https://github.com/gulpjs/gulp/tree/4.0)'s chainable serial/parallel functions. 