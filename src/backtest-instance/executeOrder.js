import calculatePositionValue from './calculatePositionValue';
import debug from 'debug';
const log = debug('WalkForward:executeOrder');

const defaultPosition = {
	size: 0,
	value: 0,
	positions: [],
};

/**
 * PLEASE READ FIRST:
 * Executes a single order (converts order to position). MAKE SURE that the price of all 
 * currentPisitions is up to date (and corresponds to price). Does NOT test if enough cash or 
 * data for price is available – do that somewhere else. The PRICE of the order is the DIFFERENCE 
 * between the old and new value.
 * 
 * @param {number} orderSize					Order size; negative for short/sell, positive for
 *                               				buy/cover.
 * @param {object} currentPosition 				Current positions of instrument that we're holding
 * @param {number} currentPosition.size			Size of all positions we're currently holding
 * @param {object[]} currentPosition.positions	Positions we're holding; each with size, value, 
 *                                           	openPrice
 * @param {number} price						Current instrument's price
 */
export default function executeOrder(orderSize, currentPosition = defaultPosition, price) {

	// Same direction (or no existing positions), enlarge position
	if (orderSize * currentPosition.size >= 0) {

		const newPositionSize = currentPosition.size + orderSize;
		const value = calculatePositionValue(price, price, orderSize);
		const newPositionValue = currentPosition.value + value;
		log('Position gets bigger, from %d to %d; position value is %d, total value %d', 
			currentPosition.size, newPositionSize, currentPosition.size, value, newPositionValue);

		return {
			value: newPositionValue,
			size: newPositionSize,
			positions: [...currentPosition.positions, {
				size: orderSize,
				value,
				openPrice: price,
			}],
		};
	}

	// Order goes in the other direction than we're holding – reduce existing positions and add an 
	// additional position if needed
	else {

		// Clone positions, don't reference anything
		const newPositions = [];

		// We close position by position – reduce outstandingOrderSize by the corresponding amount
		// until we reach 0
		let outstandingOrderSize = orderSize;

		// When selling positions, add gain to gainRealized
		let gainRealized = 0;

		// Reduce current positions until orderSize is reached; if it's not reached by reducing 
		// existing positions, create a new position
		currentPosition.positions.forEach((position) => {
			
			// Position is larger than order: Just reduce
			// No need to observe leading signs, we're going in the opposite direction
			if (Math.abs(position.size) > Math.abs(outstandingOrderSize)) {
				// Just add order size – we checked above if orderSize < position
				const newPositionSize = position.size + outstandingOrderSize;
				const newPositionValue = calculatePositionValue(price, position.openPrice, 
					newPositionSize);
				log('Reduce size of position %o to %d; remaining value is %d', position, 
					newPositionSize, newPositionValue);
				newPositions.push({
					size: newPositionSize,
					value: newPositionValue,
					openPrice: position.openPrice, // Keep the old openig price
				});
				// Calculate gain of this trade (remember: we're selling)
				const gain = position.value - newPositionValue;
				gainRealized += gain;
				outstandingOrderSize -= (newPositionSize - position.size);
				log('Realized a gain of %d, outstanding orders are still %d; total gain is %d', 
					gain, outstandingOrderSize, gainRealized);
			}
			// Same size or position is smaller than order: dump it
			else {
				outstandingOrderSize += position.size;
				gainRealized += position.value;
				log('Dump position %o', position);
			}
			
		});

		// There's still more that needs to be done to fulfill the order (reducing existing 
		// positions was not enough)
		if (outstandingOrderSize !== 0) {
			newPositions.push({
				size: outstandingOrderSize,
				value: calculatePositionValue(price, price, outstandingOrderSize),
				openPrice: price,
			});
		}

		log('New positions are %o', newPositions);
		return {
			// Re-caulcate position size and value – just to be sure
			size: newPositions.reduce((prev, item) => prev + item.size, 0),
			value: newPositions.reduce((prev, item) => prev + item.value, 0),
			positions: newPositions,
		};

	}

}


