import test from 'ava';
import ProfitFactor from './ProfitFactor';

test('returns correct result', (t) => {
    const data = {
        positions: {
            data: [[{
                closedPositions: [{
                    value: 5,
                }],
            }],
            // closedPositions missing – should work
            [{}],
            [{
                closedPositions: [{
                    value: -3,
                }, {
                    value: -1
                }],
            }], [{
                closedPositions: [{
                    value: 3,
                }],
            }]],
        },
    };
    t.is(new ProfitFactor().calculate(data), 2);
});

test('handles empty data set', (t) => {
    t.is(new ProfitFactor().calculate({ positions: { data: [] } }), undefined);
});
