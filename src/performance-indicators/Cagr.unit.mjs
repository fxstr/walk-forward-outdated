import test from 'ava';
import Cagr from './Cagr';

test('returns correct result', (t) => {
    const data = {
        accounts: {
            head: () => {
                return new Map([
                    // Use 2017 as it's not a leap year
                    ['date', new Date(2018, 0, 1)],
                    ['cash', 40],
                    ['invested', 35],
                ]);
            },
            tail: () => {
                return new Map([
                    ['date', new Date(2017, 0, 1)],
                    ['cash', 50],
                ]);
            },
        },
    };
    t.is(new Cagr().calculate(data), 0.5);
});