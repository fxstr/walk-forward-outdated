import test from 'ava';
import executeAlgorithmsSerially from './executeAlgorithmsSerially';

test('throws on invalid arguments', async(t) => {
    await t.throwsAsync(executeAlgorithmsSerially(''), /Algorithms passed in/);
    await t.throwsAsync(executeAlgorithmsSerially([], 5), /Method name passed in/);
    await t.throwsAsync(executeAlgorithmsSerially([], 'methodName', 0), /Arguments passed in/);
    // Test every single algorithm
    await t.throwsAsync(
        executeAlgorithmsSerially(['notAnObject'], 'methodName', []),
        /not an object/,
    );
    await t.throwsAsync(
        executeAlgorithmsSerially([{ methodName: 3 }], 'methodName', []),
        /does not have a method methodName/,
    );
});

test(
    'executes methods serially, does not change arguments, returns last return value',
    async(t) => {
        const allArgs = [];
        const algo = {
            method: async(...args) => {
                // Just test async execution
                await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
                // Sum up all arguments and return the sum
                allArgs.push(args);
                return allArgs.length;
            },
        };
        const result = await executeAlgorithmsSerially([algo, algo], 'method', [1, 2, 3]);
        // Result returned is undefined (value of the last executed algorithm)
        t.is(result, 2);
        // Arguments stay the same for all executions
        t.deepEqual(allArgs, [[1, 2, 3], [1, 2, 3]]);
    },
);

test('uses return value as new first argument, if set', async(t) => {
    const algo = {
        method: async(...args) => {
            // Just test async execution
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
            // Sum up all arguments and return the sum
            return args.reduce((prev, arg) => prev + arg, 0);
        },
    };
    const result = await executeAlgorithmsSerially([algo, algo], 'method', [1, 2, 3], false, true);
    // First execution: Sum is 6; second execution: sum is 6 + 2 + 3 = 11
    t.is(result, 11);
});

test('does not throw if suppressErrors is true', async(t) => {
    const algo1 = {
        empty: true,
    };
    const algo2 = {
        method: firstArgument => firstArgument + 1,
    };
    const result = await executeAlgorithmsSerially([algo1, algo2], 'method', [1], true);
    t.is(result, 2);
});

