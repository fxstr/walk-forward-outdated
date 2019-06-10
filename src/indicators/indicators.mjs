import tulind from 'tulind';
import createIndicator from './createIndicator.mjs';
import addChartConfig from './addChartConfig.mjs';

/**
* Provides a central export for all indicators.
* We use tulip indicators because:
* - Performance is good (https://tulipindicators.org/benchmark)
* - node binding contains pre-compiled windows sources (in contrast to TA-LIB, See
*   https://github.com/oransel/node-talib)
*/

// Export statements cannot be within a loop – this must be done manually. // TODO: We could
// have used an object and only do the export manually …
const Abs = addChartConfig(createIndicator(tulind.indicators.abs));
const Acos = addChartConfig(createIndicator(tulind.indicators.acos));
const Ad = addChartConfig(createIndicator(tulind.indicators.ad));
const Add = addChartConfig(createIndicator(tulind.indicators.add));
const Adosc = addChartConfig(createIndicator(tulind.indicators.adosc));
const Adx = addChartConfig(createIndicator(tulind.indicators.adx));
const Adxr = addChartConfig(createIndicator(tulind.indicators.adxr));
const Ao = addChartConfig(createIndicator(tulind.indicators.ao));
const Apo = addChartConfig(createIndicator(tulind.indicators.apo));
const Aroon = addChartConfig(createIndicator(tulind.indicators.aroon));
const Aroonosc = addChartConfig(createIndicator(tulind.indicators.aroonosc));
const Asin = addChartConfig(createIndicator(tulind.indicators.asin));
const Atan = addChartConfig(createIndicator(tulind.indicators.atan));
const Atr = addChartConfig(createIndicator(tulind.indicators.atr));
const Avgprice = addChartConfig(createIndicator(tulind.indicators.avgprice));

const Bbands = addChartConfig(createIndicator(tulind.indicators.bbands));
const Bop = addChartConfig(createIndicator(tulind.indicators.bop));

const Cci = addChartConfig(createIndicator(tulind.indicators.cci));
const Ceil = addChartConfig(createIndicator(tulind.indicators.ceil));
const Cmo = addChartConfig(createIndicator(tulind.indicators.cmo));
const Cos = addChartConfig(createIndicator(tulind.indicators.cos));
const Cosh = addChartConfig(createIndicator(tulind.indicators.cosh));
const Crossany = addChartConfig(createIndicator(tulind.indicators.crossany));
const Crossover = addChartConfig(createIndicator(tulind.indicators.crossover));
const Cvi = addChartConfig(createIndicator(tulind.indicators.cvi));

const Decay = addChartConfig(createIndicator(tulind.indicators.decay));
const Dema = addChartConfig(createIndicator(tulind.indicators.dema));
const Di = addChartConfig(createIndicator(tulind.indicators.di));
const Div = addChartConfig(createIndicator(tulind.indicators.div));
const Dm = addChartConfig(createIndicator(tulind.indicators.dm));
const Dpo = addChartConfig(createIndicator(tulind.indicators.dpo));
const Dx = addChartConfig(createIndicator(tulind.indicators.dx));

const Edecay = addChartConfig(createIndicator(tulind.indicators.edecay));
const Ema = addChartConfig(createIndicator(tulind.indicators.ema));
const Emv = addChartConfig(createIndicator(tulind.indicators.emv));
const Exp = addChartConfig(createIndicator(tulind.indicators.exp));

const Fisher = addChartConfig(createIndicator(tulind.indicators.fisher));
const Floor = addChartConfig(createIndicator(tulind.indicators.floor));
const Fosc = addChartConfig(createIndicator(tulind.indicators.fosc));

const Hma = addChartConfig(createIndicator(tulind.indicators.hma));

const Kama = addChartConfig(createIndicator(tulind.indicators.kama));
const Kvo = addChartConfig(createIndicator(tulind.indicators.kvo));

const Lag = addChartConfig(createIndicator(tulind.indicators.lag));
const Linreg = addChartConfig(createIndicator(tulind.indicators.linreg));
const Linregintercept = addChartConfig(createIndicator(tulind.indicators.linregintercept));
const Linregslope = addChartConfig(createIndicator(tulind.indicators.linregslope));
const Ln = addChartConfig(createIndicator(tulind.indicators.ln));
const Log10 = addChartConfig(createIndicator(tulind.indicators.log10));

const Macd = addChartConfig(createIndicator(tulind.indicators.macd));
const Marketfi = addChartConfig(createIndicator(tulind.indicators.marketfi));
const Mass = addChartConfig(createIndicator(tulind.indicators.mass));
const Max = addChartConfig(createIndicator(tulind.indicators.max));
const Md = addChartConfig(createIndicator(tulind.indicators.md));
const Medprice = addChartConfig(createIndicator(tulind.indicators.medprice));
const Mfi = addChartConfig(createIndicator(tulind.indicators.mfi));
const Min = addChartConfig(createIndicator(tulind.indicators.min));
const Mom = addChartConfig(createIndicator(tulind.indicators.mom));
const Msw = addChartConfig(createIndicator(tulind.indicators.msw));
const Mul = addChartConfig(createIndicator(tulind.indicators.mul));

const Natr = addChartConfig(createIndicator(tulind.indicators.natr));
const Nvi = addChartConfig(createIndicator(tulind.indicators.nvi));

const Obv = addChartConfig(createIndicator(tulind.indicators.obv));

const Ppo = addChartConfig(createIndicator(tulind.indicators.ppo));
const Psar = addChartConfig(createIndicator(tulind.indicators.psar));
const Pvi = addChartConfig(createIndicator(tulind.indicators.pvi));

const Qstick = addChartConfig(createIndicator(tulind.indicators.qstick));

const Roc = addChartConfig(createIndicator(tulind.indicators.roc));
const Rocr = addChartConfig(createIndicator(tulind.indicators.rocr));
const Round = addChartConfig(createIndicator(tulind.indicators.round));
const Rsi = addChartConfig(createIndicator(tulind.indicators.rsi));

const Sin = addChartConfig(createIndicator(tulind.indicators.sin));
const Sinh = addChartConfig(createIndicator(tulind.indicators.sinh));
const Sma = addChartConfig(createIndicator(tulind.indicators.sma));
const Sqrt = addChartConfig(createIndicator(tulind.indicators.sqrt));
const Stddev = addChartConfig(createIndicator(tulind.indicators.stddev));
const Stderr = addChartConfig(createIndicator(tulind.indicators.stderr));
const Stoch = addChartConfig(createIndicator(tulind.indicators.stoch));
const StochRSI = addChartConfig(createIndicator(tulind.indicators.stochrsi));
const Sub = addChartConfig(createIndicator(tulind.indicators.sub));
const Sum = addChartConfig(createIndicator(tulind.indicators.sum));

const Tan = addChartConfig(createIndicator(tulind.indicators.tan));
const Tanh = addChartConfig(createIndicator(tulind.indicators.tanh));
const Tema = addChartConfig(createIndicator(tulind.indicators.tema));
const Todeg = addChartConfig(createIndicator(tulind.indicators.todeg));
const Torad = addChartConfig(createIndicator(tulind.indicators.torad));
const Tr = addChartConfig(createIndicator(tulind.indicators.tr));
const Trima = addChartConfig(createIndicator(tulind.indicators.trima));
const Trix = addChartConfig(createIndicator(tulind.indicators.trix));
const Trunc = addChartConfig(createIndicator(tulind.indicators.trunc));
const Tsf = addChartConfig(createIndicator(tulind.indicators.tsf));
const Typprice = addChartConfig(createIndicator(tulind.indicators.typprice));

const Ultosc = addChartConfig(createIndicator(tulind.indicators.ultosc));

// One exception: var becomes Variance as var is a protected word
const Variance = addChartConfig(createIndicator(tulind.indicators.var));
const Vhf = addChartConfig(createIndicator(tulind.indicators.vhf));
const Vidya = addChartConfig(createIndicator(tulind.indicators.vidya));
const Volatility = addChartConfig(createIndicator(tulind.indicators.volatility));
const Vosc = addChartConfig(createIndicator(tulind.indicators.vosc));
const Vwma = addChartConfig(createIndicator(tulind.indicators.vwma));

const Wad = addChartConfig(createIndicator(tulind.indicators.wad));
const Wcprice = addChartConfig(createIndicator(tulind.indicators.wcprice));
const Wilders = addChartConfig(createIndicator(tulind.indicators.wilders));
const Willr = addChartConfig(createIndicator(tulind.indicators.willr));
const Wma = addChartConfig(createIndicator(tulind.indicators.wma));

const Zlema = addChartConfig(createIndicator(tulind.indicators.zlema));




export default {
    Abs, Acos, Ad, Add, Adosc, Adx, Adxr, Ao, Apo, Aroon, Aroonosc, Asin, Atan, Atr, Avgprice,
    Bbands, Bop, Cci, Ceil, Cmo, Cos, Cosh, Crossany, Crossover, Cvi, Decay, Dema, Di, Div, Dm, Dpo,
    Dx, Edecay, Ema, Emv, Exp, Fisher, Floor, Fosc, Hma, Kama, Kvo, Lag, Linreg, Linregintercept,
    Linregslope, Ln, Log10, Macd, Marketfi, Mass, Max, Md, Medprice, Mfi, Min, Mom, Msw, Mul, Natr,
    Nvi, Obv, Ppo, Psar, Pvi, Qstick, Roc, Rocr, Round, Rsi, Sin, Sinh, Sma, Sqrt, Stddev, Stderr,
    Stoch, StochRSI, Sub, Sum, Tan, Tanh, Tema, Todeg, Torad, Tr, Trima, Trix, Trunc, Tsf, Typprice,
    Ultosc, Variance, Vhf, Vidya, Volatility, Vosc, Vwma, Wad, Wcprice, Wilders, Willr, Wma, Zlema,
};


