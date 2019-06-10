import glob from 'glob';
import logger from '../../logger/logger';
const { debug } = logger('WalkForward:specToPath');


/**
* Gets all paths from pathSpecs
* @param {array} specs
*/
async function getPathsFromSpecs(specs) {
	debug('Get paths from specs %o', specs);
	return Promise.all(specs.map((spec) => {
		return getPathsFromSpec(spec);
	})).then((paths) => {
		debug('Got paths %o', paths);
		// paths is an array that consists of multiple arrays; flatten it
		return paths.reduce((prev, item) => prev.concat(item), []);
	});
}


/**
* Convert glob's callback into a Promise
* @private
*/
async function getPathsFromSpec(spec) {
	return new Promise((resolve, reject) => {
		glob(spec, (err, filePaths) => {
			debug('Paths for spec %o are %o', spec, filePaths);
			if (err) reject(err);
			else resolve(filePaths);
		});
	});
}

export { getPathsFromSpec, getPathsFromSpecs };