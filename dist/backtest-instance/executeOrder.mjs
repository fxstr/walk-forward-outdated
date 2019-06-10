function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import calculatePositionValue from './calculatePositionValue';
import logger from '../logger/logger';
const {
  debug
} = logger('WalkForward:executeOrder');
const defaultPosition = {
  size: 0,
  value: 0,
  positions: []
};
/**
 * PLEASE READ FIRST:
 * Executes a single order (converts order to position). MAKE SURE that the price of all
 * currentPisitions is up to date (and corresponds to price). Does NOT test if enough cash or
 * data for price is available – do that somewhere else. The PRICE of the order is the DIFFERENCE
 * between the old and new value.
 *
 * @param {number} orderSize                    Order size; negative for short/sell, positive for
 *                                              buy/cover.
 * @param {object} currentPosition              Current positions of instrument that we're holding
 * @param {number} currentPosition.size         Size of all positions we're currently holding
 * @param {object[]} currentPosition.positions  Positions we're holding; each with size, value,
 *                                              openPrice
 * @param {number} price                        Current instrument's price
 */

export default function executeOrder(orderSize, currentPosition = defaultPosition, price) {
  // Same direction (or no existing positions), enlarge position
  if (orderSize * currentPosition.size >= 0) {
    const newPositionSize = currentPosition.size + orderSize;
    const value = calculatePositionValue(price, price, orderSize);
    const newPositionValue = currentPosition.value + value;
    debug('Position gets bigger, from %d to %d; position value is %d, total value %d', currentPosition.size, newPositionSize, currentPosition.size, value, newPositionValue);
    return {
      value: newPositionValue,
      size: newPositionSize,
      positions: [...currentPosition.positions, {
        size: orderSize,
        value,
        openPrice: price
      }]
    };
  } // Order goes in the *other* direction than we're holding – reduce existing positions and add an
  // additional position if needed
  else {
      // Clone positions, don't reference anything
      const newPositions = []; // We need closed positions to calculate a strategy's KPIs (e.g. profit factor)

      const closedPositions = []; // We close position by position – reduce outstandingOrderSize by the corresponding amount
      // until we reach 0

      let outstandingOrderSize = orderSize; // When selling positions, add gain to gainRealized

      let gainRealized = 0; // Reduce current positions until orderSize is reached; if it's not reached by reducing
      // existing positions, create a new position

      currentPosition.positions.forEach(position => {
        // Position is larger than outstanding order: Just reduce; if outstandingOrderSize is
        // 0, position is just added to newPositions (unchanged)
        // No need to observe leading signs, we're going in the opposite direction
        if (Math.abs(position.size) > Math.abs(outstandingOrderSize)) {
          // Just add order size – we checked above if orderSize < position
          const newPositionSize = position.size + outstandingOrderSize;
          const newPositionValue = calculatePositionValue(price, position.openPrice, newPositionSize);
          debug('Reduce size of position %o to %d; remaining value is %d', position, newPositionSize, newPositionValue);
          newPositions.push({
            size: newPositionSize,
            value: newPositionValue,
            openPrice: position.openPrice // Keep the old openig price

          }); // If order size !== 0, add reduced position to closingPositions

          if (outstandingOrderSize !== 0) {
            closedPositions.push({
              size: outstandingOrderSize * -1,
              value: calculatePositionValue(price, position.openPrice, outstandingOrderSize * -1),
              openPrice: position.openPrice
            });
          } // Calculate gain of this trade (remember: we're selling/reducing size)


          const gain = position.value - newPositionValue;
          gainRealized += gain;
          outstandingOrderSize -= newPositionSize - position.size;
          debug('Realized a gain of %d, outstanding orders are still %d; total gain is %d', gain, outstandingOrderSize, gainRealized);
        } // Same size or position is smaller than order: dump it
        else {
            outstandingOrderSize += position.size;
            gainRealized += position.value;
            closedPositions.push(_objectSpread({}, position));
            debug('Dump position %o', position);
          }
      }); // There's still more that needs to be done to fulfill the order (reducing existing
      // positions was not enough)

      if (outstandingOrderSize !== 0) {
        newPositions.push({
          size: outstandingOrderSize,
          value: calculatePositionValue(price, price, outstandingOrderSize),
          openPrice: price
        });
      }

      debug('New positions are %o', newPositions);
      const currentClosedPositions = currentPosition.closedPositions || [];
      return {
        // Re-caulcate position size and value – just to be sure
        size: newPositions.reduce((prev, item) => prev + item.size, 0),
        value: newPositions.reduce((prev, item) => prev + item.value, 0),
        positions: newPositions,
        closedPositions: [...currentClosedPositions, ...closedPositions]
      };
    }
}
//# sourceMappingURL=executeOrder.mjs.map