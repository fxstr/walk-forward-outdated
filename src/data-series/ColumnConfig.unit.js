import test from 'ava';
import ColumnConfig from './ColumnConfig';

test('todo', (t) => {
    const cc = new ColumnConfig();
    t.is(cc.description, '');
});