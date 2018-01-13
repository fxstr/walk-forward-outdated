class Backtest {

	addStrategies(strategiesFuntion) {
		this.strategiesFuntion = strategiesFuntion;
	}

	run() {
		const context = { open: 3, close: 4 };
		this.strategiesFuntion.apply(context, [{ smaPeriod: 5 }]);
	}

}

const bt = new Backtest();
bt.addStrategies(function(config) {
	console.log(config);
	console.log(this);
});
bt.run();