import test from 'ava';
import formatDate from './formatDate';

test('formats date', (t) => {
    const date = new Date(2018, 0, 2, 15, 20, 0);
    t.is(formatDate(date), '2018-01-02 15:20:00');
});
