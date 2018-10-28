import fs from 'fs';
import path from 'path';
import test from 'ava';
import del from 'del';
import exportToCsv from './exportToCsv';

function getDir() {
    return path.join(__dirname, 'test-data');
}

// Destroy and create test-data directory
try {
    del.sync(getDir());
    fs.mkdirSync(getDir());
}
catch(err) {
    console.log('Could not remove/create directory', err);
}

test('exports', async (t) => {
    const target = path.join(getDir(), 'success.csv');
    await (exportToCsv(target, [['a', 'b'], [1, 2]]));
    const written = await fs.readFileSync(target, 'utf8');
    t.is(written, 'a,b\n1,2');
    fs.unlinkSync(target);
});

test('exports date as ISO string', async (t) => {
    const target = path.join(getDir(), 'success.csv');
    await (exportToCsv(target, [['a', 'b'], [1, new Date(2018, 0, 1)]]));
    const written = await fs.readFileSync(target, 'utf8');
    // TODO: Use time zone independent dates
    t.is(written, 'a,b\n1,2017-12-31T23:00:00.000Z');
    fs.unlinkSync(target);
});

test('fails', async (t) => {
    const target = path.join(getDir(), 'does-not-exist', 'fail.csv');
    await t.throwsAsync(() => exportToCsv(target, [['a', 'b'], [1, 2]]));
});