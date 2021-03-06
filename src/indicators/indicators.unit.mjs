import test from 'ava';
import tulind from 'tulind';
import indicators from './indicators' ;


test('exports are correct', (t) => {
    // Go through all of tuli's indicators and see if they were exported
    Object.keys(tulind.indicators).forEach((name) => {
        // Exception for «var»
        if (name === 'var') name = 'variance';
        if (name === 'stochrsi') name = 'StochRSI';
        t.is(typeof indicators[upperCase(name)], 'function', `Indicator ${name} not found`);
    });
});

function upperCase(name) {
    return name.substr(0, 1).toUpperCase() + name.substr(1);
}