export default function validateBacktestConfig(config, template) {

    if (!(config instanceof Map) || !(template instanceof Map)) {
        throw new Error(`validateBacktestConfig: Config and config template must both be a Map, are ${config} and ${template}.`);
    }

    // Check that every mandatory key from template is provided in config
    for (const [key, keyConfig] of template) {
        if (!keyConfig.optional && !config.get(key)) {
            throw new Error(`validateBacktestConfig: Key ${key} is mandatory for config, you did not pass a configuration with this key.`);
        }
    }


    // Go through config
    for (const [key, keyConfig] of config) {


        // Key does not exist in template: display a warning, might be a typo
        if (!template.has(key)) {
            console.debug(`WARNING: You passed a config key that contains an unknown key (${key}). Valid keys are ${Array.from(template.keys()).join(', ')}.`);
        }

        // Test validity
        else {
            const testFunction = template.get(key).test;
            if (testFunction !== undefined) {
                if (typeof testFunction !== 'function') {
                    throw new Error(`validateBacktestConfig: test property provided in config template for key ${key} is not a function but ${typeof testFunction}.`);
                }
                const testResult = testFunction(keyConfig);
                if (!testResult) {
                    throw new Error(`validateBacktestConfig: config for key ${key} did not pass validity test of config template: ${template.get(key).testFailedMessage}`);
                }
            }
        }
    }

    const validatedConfig = new Map();

    for (const [key, keyConfig] of template) {
        // Use default if provided and if value is missing
        if (!config.has(key)) {
            // Only add default if it's present on the template
            if (Object.prototype.hasOwnProperty.call(keyConfig, 'default')) {
                validatedConfig.set(key, keyConfig.default);
            }
        }
        else {
            validatedConfig.set(key, config.get(key));
        }


    }

    return validatedConfig;

}

