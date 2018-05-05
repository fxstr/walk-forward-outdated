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
	const merged = orders.reduce((prev, order) => {
		prev.set(order.instrument, {
			instrument: order.instrument,
			size: (prev.has(order.instrument) && prev.get(order.instrument).size || 0) + order.size,
		});
		return prev;
	}, new Map());
	return Array.from(merged.values());
}