/**
* Sort our orders; the ones that become smaller come first, then the ones that stay the same (
* order size 0 or previousOrderSize * -1), and finally the ones that become larger.
* @param {Object[]} orders					Orders to sort
* @param {number} orders[].size
* @param {Instrument} orders[].instrument
* @param {Symbol} sizeKey					Every instrument has a key which holds its current 
*											position size; we need that key to access the property's
*											value (position size).
*/
export default function sortOrdersBySizeChange(orders, sizeKey) {
	const sorted = orders.reduce((prev, order) => {
		const originalSize = order.instrument[sizeKey] || 0;
		// Same size (leading sign might change)
		if (Math.abs(originalSize) === Math.abs(originalSize + order.size)) {
			prev.same.push(order);
		} 
		// Amount becomes smaller
		else if (Math.abs(originalSize) > Math.abs(originalSize + order.size)) {
			prev.smaller.push(order);
		}
		else prev.larger.push(order);
		return prev;
	}, { larger: [], smaller: [], same: [] });
	return [ ...sorted.smaller, ...sorted.same, ...sorted.larger ];
}