import createIndicator from './createIndicator';
import tulind from 'tulind';

/**
* Provides a central export for all indicators.
* We use tulip indicators because:
* - Performance is good (https://tulipindicators.org/benchmark)
* - node binding contains pre-compiled windows sources (in contrast to TA-LIB, see
*   https://github.com/oransel/node-talib)
*/

// Export statements cannot be within a loop – this must be done manually. // TODO: We could
// have used an object and only do the export manually …
const abs = createIndicator(tulind.indicators.abs);
const acos = createIndicator(tulind.indicators.acos);
const ad = createIndicator(tulind.indicators.ad);
const add = createIndicator(tulind.indicators.add);
const adosc = createIndicator(tulind.indicators.adosc);
const adx = createIndicator(tulind.indicators.adx);
const adxr = createIndicator(tulind.indicators.adxr);
const ao = createIndicator(tulind.indicators.ao);
const apo = createIndicator(tulind.indicators.apo);
const aroon = createIndicator(tulind.indicators.aroon);
const aroonosc = createIndicator(tulind.indicators.aroonosc);
const asin = createIndicator(tulind.indicators.asin);
const atan = createIndicator(tulind.indicators.atan);
const atr = createIndicator(tulind.indicators.atr);
const avgprice = createIndicator(tulind.indicators.avgprice);

const bbands = createIndicator(tulind.indicators.bbands);
const bop = createIndicator(tulind.indicators.bop);

const cci = createIndicator(tulind.indicators.cci);
const ceil = createIndicator(tulind.indicators.ceil);
const cmo = createIndicator(tulind.indicators.cmo);
const cos = createIndicator(tulind.indicators.cos);
const cosh = createIndicator(tulind.indicators.cosh);
const crossany = createIndicator(tulind.indicators.crossany);
const crossover = createIndicator(tulind.indicators.crossover);
const cvi = createIndicator(tulind.indicators.cvi);

const decay = createIndicator(tulind.indicators.decay);
const dema = createIndicator(tulind.indicators.dema);
const di = createIndicator(tulind.indicators.di);
const div = createIndicator(tulind.indicators.div);
const dm = createIndicator(tulind.indicators.dm);
const dpo = createIndicator(tulind.indicators.dpo);
const dx = createIndicator(tulind.indicators.dx);

const edecay = createIndicator(tulind.indicators.edecay);
const ema = createIndicator(tulind.indicators.ema);
const emv = createIndicator(tulind.indicators.emv);
const exp = createIndicator(tulind.indicators.exp);

const fisher = createIndicator(tulind.indicators.fisher);
const floor = createIndicator(tulind.indicators.floor);
const fosc = createIndicator(tulind.indicators.fosc);

const hma = createIndicator(tulind.indicators.hma);

const kama = createIndicator(tulind.indicators.kama);
const kvo = createIndicator(tulind.indicators.kvo);

const lag = createIndicator(tulind.indicators.lag);
const linreg = createIndicator(tulind.indicators.linreg);
const linregintercept = createIndicator(tulind.indicators.linregintercept);
const linregslope = createIndicator(tulind.indicators.linregslope);
const ln = createIndicator(tulind.indicators.ln);
const log10 = createIndicator(tulind.indicators.log10);

const macd = createIndicator(tulind.indicators.macd);
const marketfi = createIndicator(tulind.indicators.marketfi);
const mass = createIndicator(tulind.indicators.mass);
const max = createIndicator(tulind.indicators.max);
const md = createIndicator(tulind.indicators.md);
const medprice = createIndicator(tulind.indicators.medprice);
const mfi = createIndicator(tulind.indicators.mfi);
const min = createIndicator(tulind.indicators.min);
const mom = createIndicator(tulind.indicators.mom);
const msw = createIndicator(tulind.indicators.msw);
const mul = createIndicator(tulind.indicators.mul);

const natr = createIndicator(tulind.indicators.natr);
const nvi = createIndicator(tulind.indicators.nvi);

const obv = createIndicator(tulind.indicators.obv);
const ppo = createIndicator(tulind.indicators.ppo);
const psar = createIndicator(tulind.indicators.psar);
const pvi = createIndicator(tulind.indicators.pvi);

const qstick = createIndicator(tulind.indicators.qstick);

const roc = createIndicator(tulind.indicators.roc);
const rocr = createIndicator(tulind.indicators.rocr);
const round = createIndicator(tulind.indicators.round);
const rsi = createIndicator(tulind.indicators.rsi);

const sin = createIndicator(tulind.indicators.sin);
const sinh = createIndicator(tulind.indicators.sinh);
const sma = createIndicator(tulind.indicators.sma);
const sqrt = createIndicator(tulind.indicators.sqrt);
const stddev = createIndicator(tulind.indicators.stddev);
const stderr = createIndicator(tulind.indicators.stderr);
const stoch = createIndicator(tulind.indicators.stoch);
const sub = createIndicator(tulind.indicators.sub);
const sum = createIndicator(tulind.indicators.sum);

const tan = createIndicator(tulind.indicators.tan);
const tanh = createIndicator(tulind.indicators.tanh);
const tema = createIndicator(tulind.indicators.tema);
const todeg = createIndicator(tulind.indicators.todeg);
const torad = createIndicator(tulind.indicators.torad);
const tr = createIndicator(tulind.indicators.tr);
const trima = createIndicator(tulind.indicators.trima);
const trix = createIndicator(tulind.indicators.trix);
const trunc = createIndicator(tulind.indicators.trunc);
const tsf = createIndicator(tulind.indicators.tsf);
const typprice = createIndicator(tulind.indicators.typprice);

const ultosc = createIndicator(tulind.indicators.ultosc);

// One exception: var becomes 
const variance = createIndicator(tulind.indicators.var);
const vhf = createIndicator(tulind.indicators.vhf);
const vidya = createIndicator(tulind.indicators.vidya);
const volatility = createIndicator(tulind.indicators.volatility);
const vosc = createIndicator(tulind.indicators.vosc);
const vwma = createIndicator(tulind.indicators.vwma);

const wad = createIndicator(tulind.indicators.wad);
const wcprice = createIndicator(tulind.indicators.wcprice);
const wilders = createIndicator(tulind.indicators.wilders);
const willr = createIndicator(tulind.indicators.willr);
const wma = createIndicator(tulind.indicators.wma);

const zlema = createIndicator(tulind.indicators.zlema);




export { abs, acos, ad, add, adosc, adx, adxr, ao, apo, aroon, aroonosc, asin, atan, atr, avgprice, 
    bbands, bop, cci, ceil, cmo, cos, cosh, crossany, crossover, cvi, decay, dema, di, div, dm, dpo, 
    dx, edecay, ema, emv, exp, fisher, floor, fosc, hma, kama, kvo, lag, linreg, linregintercept,
    linregslope, ln, log10, macd, marketfi, mass, max, md, medprice, mfi, min, mom, msw, mul, natr,
    nvi, obv, ppo, psar, pvi, qstick, roc, rocr, round, rsi, sin, sinh, sma, sqrt, stddev, stderr, 
    stoch, sub, sum, tan, tanh, tema, todeg, torad, tr, trima, trix, trunc, tsf, typprice, ultosc,
    variance, vhf, vidya, volatility, vosc, vwma, wad, wcprice, wilders, willr, wma, zlema };


