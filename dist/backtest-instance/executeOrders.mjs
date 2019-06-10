function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import colors from 'colors';
import logger from '../logger/logger';
import executeOrder from './executeOrder';
const {
  debug,
  info
} = logger('WalkForward:executeOrders');
/**
 * Helper function that returns the effective net price of an order; if order reduces the position
 * size, it will free money, price will be negative; else positive. We want to start with these
 * orders to free money before we spend it.
 */

function getNetCost(newPosition, oldPosition) {
  return newPosition.value - (oldPosition && oldPosition.value || 0);
}
/**
 * Executes orders: basically takes positions and returns new positions.
 * @param {Map} positions           Current positions. Key is instrument, value is an object with
 *                                  size, value, positions, closedPositions
 * @param {Map} orders              Orders to execute. Key is instrument, value an object with
 *                                  a size property
 * @param {Map} prices              Current prices; key is instrument, value current price
 * @param {number} cash             Current cash
 * @return {Map}                    Key: instrument, value an object with size, value, positions
 *                                  and closedPositions (see executeOrder)
 */


export default function executeOrders(positions, orders, prices, cash) {
  // Create a new variable to not change cash which is an argument
  let cashAfterOrderExecution = cash; // Convert orders to array because
  // 1) it used to be an array before the refactor
  // 2) we can easily call methods on it

  const ordersAsArray = [];

  for (const [instrument, order] of orders) {
    // Every order has a field size (which is passed in order) and instrument
    ordersAsArray.push(_objectSpread({}, order, {
      instrument
    }));
  } // Create beautiful logs


  const positionsForLog = [];

  for (const [instrument, position] of positions) {
    positionsForLog.push(`${instrument.name}:${position.size}`);
  }

  const ordersForLog = ordersAsArray.map(order => `${order.instrument.name}:${order.size}`);
  const pricesForLog = [];

  for (const [instrument, price] of prices) {
    pricesForLog.push(`${instrument.name}:${price}`);
  }

  debug('Execute orders, positions are %o, orders %o, prices %o, cash %d', positionsForLog.join(', '), ordersForLog.join(', '), pricesForLog.join(', '), cashAfterOrderExecution); // Start by cloning the old positions

  const newPositions = new Map(positions);
  ordersAsArray // Don't order if there's no price for this bar
  .filter(order => {
    if (!prices.has(order.instrument)) {
      info('Cannot take position for %s, no prices available', order.instrument.name);
      return false;
    }

    return true;
  }) // Get new position that would result if we were to execute the order
  .map(order => {
    const position = executeOrder(order.size, positions.get(order.instrument), prices.get(order.instrument));
    return {
      instrument: order.instrument,
      position
    };
  }) // Sort orders by price; buy the ones freeing money first
  .sort((a, b) => {
    const aPrice = getNetCost(a.position, positions.get(a.instrument));
    const bPrice = getNetCost(b.position, positions.get(b.instrument));
    return aPrice > bPrice ? 1 : -1;
  }) // Execute orders if there's enough cash
  .forEach(order => {
    const netCost = getNetCost(order.position, positions.get(order.instrument));
    info('Try to execute order for %s, net cost is %d, cash is %d', order.instrument.name, netCost, cashAfterOrderExecution); // Not enough money

    if (netCost > cashAfterOrderExecution) {
      console.warn(colors.yellow('WARNING: Cannot execute order for %s, value is %d, cash available %d'), order.instrument.name, order.position.value, cashAfterOrderExecution);
      return;
    }

    cashAfterOrderExecution -= netCost; // All fine

    info('Executed order for %s, new size is %d, net cost was %d, cash is %d', order.instrument.name, order.position.size, netCost, cashAfterOrderExecution);
    newPositions.set(order.instrument, order.position);
  });
  return newPositions;
}
//# sourceMappingURL=executeOrders.mjs.map