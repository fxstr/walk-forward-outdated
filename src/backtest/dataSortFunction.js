export default function(a, b) {
	if (!a.date || !b.date) throw new Error(`dataSortFunction: date property not available on
		entries.`);
	if (!(a.date instanceof Date) || !(b.date instanceof Date)) throw new Error(`dataSortFunction: 
		date property must be an instance of Date.`);

	// Sort by date first (youngest on top), then by index (when returning 0):
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
	return a.date.getTime() - b.date.getTime();
}