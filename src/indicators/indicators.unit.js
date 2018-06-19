import test from 'ava';
import tulind from 'tulind';
import * as indicators from './indicators' ;


test('exports are correct', (t) => {
    // Go through all of tuli's indicators and see if they were exported
    Object.keys(tulind.indicators).forEach((name) => {
        // Exception for «var»
        if (name === 'var') name = 'variance';
        if (typeof indicators[name] !== 'function') console.log(name);
        t.is(typeof indicators[name], 'function');
    });
});