import debugLevels from './debugLevels';
/**
 * Parses environment config for debug levels.
 * @param  {String} string
 * @return {String[]}
 */
export default function getDebugLevels(string = '') {
    const levels = string.toLowerCase().split(/\s*,\s*/);
    const validLevels = Object.keys(debugLevels);
    // If levels are not specified (array of empty string, as we split a string), all levels will
    // be logged
    if (levels === ['']) return validLevels;
    return levels.filter((level) => {
        const valid = validLevels.includes(level);
        if (!valid) console.warn(`getDebugLevels: Level ${level} unknown, use one of ${validLevels.join(',')}.`);
        return valid;
    });
}