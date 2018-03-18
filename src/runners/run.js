/**
* Run function takes some params and returns them as an array. Why'd we do that?
* When we're using setStrategies() on a backtest, we're adding a function which we're executing as
* soon as the user calls backtest.run(). Within the function added, we use run() commands to run
* the backtest. We, however, need to pass additional arguments to the real run function (mainly
* the backtest's config, e.g. backtest start date, account value, commissions etc.). 
* To keep the API sleek, we use this fake run method which only takes three arguments: 
* the strategy (runThrough/rejectOnFalse, instruments and a name)
* We then use runStrategy to *really* run the strategy with the additional parameters passed.
*/
export default function run(...params) {
	return params;
}
