import debug from 'debug';
import colors from 'colors';
import executeOrder from './executeOrder';
const log = debug('WalkForward:executeOrders');

/**
 * Executes orders: basically takes positions and returns new positions.
 * @param {Map} positions 			Current positions 
 * @param {object[]} orders 		Orders to execute
 * @param {number} orders[].size	Size of order to take
 * @param {Instrument} orders[].instrument	Instrument to order
 * @param {Map} prices				Current prices; key is instrument, value current price
 * @param {number} cash				Current cash 
 * @return {object}
 */
export default function executeOrders(positions, orders, prices, cash) {


	// Start by cloning the old positions
	const newPositions = new Map(positions);

	log('Execute orders, positions are %o, orders %o, prices %o, cash %d', positions, orders, 
		prices, cash);

	orders
		// Don't order if there's no price for this bar
		.filter((order) => {
			if (!prices.has(order.instrument)) {
				log(`Cannot take position for instrument %s, no price available`, 
					order.instrument.name);
				return false;
			}
			return true;
		})

		// Get new position that would result if we were to execute the order; map array into
		// objects with { instrument, position }
		.map((order) => {
			const position = executeOrder(order.size, positions.get(order.instrument), 
				prices.get(order.instrument));
			return { instrument: order.instrument, position };
		})

		// Sort orders by price; buy the ones freeing money first
		.sort((a, b) => {
			return getPrice(a.position, positions.get(a.instrument)) - 
				getPrice(b.position, positions.get(b.instrument));
		})
		
		// Execute orders if there's enough cash
		.forEach((order) => {
		
			// Not enough money
			if (order.position.value > cash) {
				console.warn(colors.yellow(`WARNING: Cannot execute order for %s, value is %d,
					cash available %d`), order.instrument.name, order.position.value, cash);
				return;
			}

			// All fine
			newPositions.set(order.instrument, order.position);
			cash -= order.position.value;

		});

	return newPositions;

}


function getPrice(newPosition, oldPosition) {
	return ((oldPosition && oldPosition.value) || 0) - newPosition.value;
}

