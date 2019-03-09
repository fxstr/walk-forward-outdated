import test from 'ava';
import validateBacktestConfig from './validateBacktestConfig';

test('throws if config is not a map', (t) => {
    t.throws(() => validateBacktestConfig({}), /must both be a Map/);
    t.throws(() => validateBacktestConfig(new Map(), {}), /must both be a Map/);
    t.notThrows(() => validateBacktestConfig(new Map(), new Map()));
});

test('throws if mandatory config is missing', (t) => {
    const template = new Map([
        ['keyName', {}], // No optional parameter
    ]);
    const config = new Map([
        ['invalidKey', true],
    ]);
    t.throws(() => validateBacktestConfig(config, template), /Key keyName is mandatory/);
});

test('throws if test is not a function', (t) => {
    const template = new Map([
        ['keyName', {
            test: 'notafunction',
        }],
    ]);
    const config = new Map([
        ['keyName', true],
    ]);
    t.throws(() => validateBacktestConfig(config, template), /is not a function but string/);
});

test('works if test is not provided', (t) => {
    const template = new Map([
        ['keyName', {}],
    ]);
    const config = new Map([
        ['keyName', true],
    ]);
    t.notThrows(() => validateBacktestConfig(config, template));
});

test('works if key is not part of template', (t) => {
    const template = new Map([
    ]);
    const config = new Map([
        ['keyName', true],
    ]);
    t.notThrows(() => validateBacktestConfig(config, template));
});

test('throws with correct message if test does not pass', (t) => {
    const template = new Map([
        ['keyName', {
            test: value => value > 10,
            testFailedMessage: 'value must be > 10',
        }],
    ]);
    const config = new Map([
        ['keyName', 9],
    ]);
    t.throws(() => validateBacktestConfig(config, template), /config template: value must be > 10/);
});

test('replaces empty with default values', (t) => {
    const template = new Map([
        ['key1', {
            optional: true,
            default: undefined,
        }],
        ['key2', {
            optional: true,
            default: false,
        }],
        ['key3', {
            optional: true,
            default: 9,
        }],
        ['key4', {
            optional: true, // no default option, should not be added to validated config
        }],
    ]);
    const config = new Map([
        ['key3', undefined], // Should not be overwritten, as key is there
    ]);
    const result = validateBacktestConfig(config, template);
    t.deepEqual(result, new Map([
        ['key1', undefined],
        ['key2', false],
        ['key3', undefined],
    ]));

});

