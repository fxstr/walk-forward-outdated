# Walk Forward

Walk Forward is a framework that let's you backtest your trading strategies (stocks, futures, forex, crypto currencies, …). It is completely written in JavaScript.

## Features

- Let's you plug in any data source you like – CSVs, web services, a broker's API etc. (for now only supports CSVs out of the box.)
- Handles any instrument you wish to backtest: Futures, Stocks, Crypto Currencies, Forex etc.
- Produces standardized CSV output that can be read and displayed by any CSV-capable application (Google Spreadsheets, Microsoft Excel; a matching frontend is on the roadmap)
- Parameter optimization (with log scales)
- Written in a flexbile, heavily used and steadily improving language (yes, JavaScript), using current developments (ES6 modules, `async`/`await`)
- Used and tested (unit/integration tests) on the server side, but should also work in the frontend
- Open source (ISC license)
- Uses some of [tulip's](https://tulipindicators.org) indicators

## Example Code

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
- [ ] Interactive frontend (ZIP-files can be dropped)
- [ ] Instrument configuration (type of instrument)
- [ ] Margin handling
- [ ] More optimization techniques (in addition to current log of golden ratio, e.g. linear, other log bases, integers only instead of floats)
- [ ] Relevant ouptut in form of tables (orders, positions in addition to charts)
- [ ] Better charts for parameter optimization (2D/3D visualization)
- [ ] More data sources
- [ ] Currency handling
- [ ] Walk forward optimization
- Better docs, always better docs

## Inspiration

[koa](http://koajs.com/)'s Middleware, [bt](http://pmorissette.github.io/bt/)'s reusable algos, [glulp 4](https://github.com/gulpjs/gulp/tree/4.0)'s chainable serial/parallel functions. 