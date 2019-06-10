export default class Cagr {
  calculate(backtest) {
    const lastEntry = backtest.accounts.head();
    const firstEntry = backtest.accounts.tail();
    const end = lastEntry.get('cash') + lastEntry.get('invested');
    const start = firstEntry.get('cash');
    const msDiff = lastEntry.get('date').getTime() - firstEntry.get('date').getTime();
    const yearDiff = msDiff / 1000 / 60 / 60 / 24 / 365; // console.log('start, end, yearDiff', start, end, yearDiff);

    return (end / start) ** (1 / yearDiff) - 1;
  }

  getName() {
    return 'CompoundAnnualGrowthRate';
  }

}
//# sourceMappingURL=Cagr.mjs.map