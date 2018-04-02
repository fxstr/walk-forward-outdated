/**
* Takes an object and converts its keys (objects/strings) to a Map
* @param {object} object		Object to convert
* @returns {Map}
*/
export default function convertObjectToMap(object) {

	if (typeof object !== 'object' || object === null) throw new Error(`convertObjectToMap: Pass 
		an object as only parameter.`);

	const map = new Map();
	Object.keys(object).concat(Object.getOwnPropertySymbols(object)).forEach((key) => {
		map.set(key, object[key]);		
	});
	return map;
}