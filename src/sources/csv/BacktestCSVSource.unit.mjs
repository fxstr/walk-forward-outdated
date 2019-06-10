import test from 'ava';
import BacktestCSVSource from './BacktestCSVSource';

function setupData() {
    const data = [
        new Map([
            ['date', new Date(2019, 0, 1)],
            ['open', 3],
        ]),
        new Map([
            ['date', new Date(2019, 0, 5)],
            ['open', 2],
        ]),
        new Map([
            ['date', new Date(2019, 0, 2)],
            ['open', 4],
        ]),
        new Map([
            ['date', new Date(2019, 0, 1)],
            ['open', 5],
        ]),
        new Map([
            ['date', new Date(2019, 0, 4)],
            ['open', 2],
        ]),
    ];
    const dataSource = {
        read: async() => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return data;
        },
    };
    return { data, dataSource };
}

test('fails if initialized invalidly', (t) => {
    t.throws(() => new BacktestCSVSource(), /valid CSV source/);
    t.throws(() => new BacktestCSVSource({}), /read method/);
    t.throws(() => new BacktestCSVSource({ read: 3 }), /read method/);
    t.notThrows(() => new BacktestCSVSource({ read: () => {} }), /read method/);
});

test('generates data', async(t) => {
    const { dataSource, data } = setupData();
    const bt = new BacktestCSVSource(dataSource);
    const rows = [];
    for await (const row of bt.generate()) {
        rows.push(row);
    }
    t.deepEqual(rows, [
        [data[0], data[3]],
        [data[2]],
        [data[4]],
        [data[1]],
    ]);
});
