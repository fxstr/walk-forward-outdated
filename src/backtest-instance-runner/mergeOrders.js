/**
* Orders come in as an array of objects, each with properties instrument and size. One instrument
* may appear multiple times – add its size up.
* @param {Object[]} orders				Orders to merge
* @param {number} orders[].size			Order's size
* @param {Instrument} orders[].size		Order's instrument
* @returns {Array} 						Merged orders, structured in the same way as the param 
*										passed
*/
export default function mergeOrders(orders) {
	const mapped = orders.reduce((prev, order) => {
		// Instrument does not exist in map: set it
		if (!prev.has(order.instrument)) prev.set(order.instrument, order);
		// Instrument exists in map: just update the size
		else prev.get(order.instrument).size += order.size;
		return prev;
	}, new Map());
	return Array.from(mapped.values());
}