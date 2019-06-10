function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import calculatePositionValue from './calculatePositionValue';
import logger from '../logger/logger';
const {
  debug
} = logger('WalkForward:calculatePositionsValues');
/**
 * Calculates current values for all positions passed. Positions is the object as used in
 * BacktestInstanceRunner.
 * @param  {Map} positions      Current positions (key is instrument, value a position object)
 * @param  {Map} prices         Current prices (key is instrument, value is price)
 * @return {Map}
 */

export default function calculatePositionsValues(positions, prices) {
  const newPositions = new Map();
  positions.forEach((position, instrument) => {
    const subPositions = position.positions.map(subPosition => {
      const clonedSubPosition = _objectSpread({}, subPosition); // If no price is available, position is unchanged


      if (prices.has(instrument)) {
        clonedSubPosition.value = calculatePositionValue(prices.get(instrument), subPosition.openPrice, subPosition.size);
      }

      return clonedSubPosition;
    });
    debug('new subPositions are %o', subPositions);
    newPositions.set(instrument, {
      value: subPositions.reduce((prev, subPos) => prev + subPos.value, 0),
      size: position.size,
      positions: subPositions
    }); // Preserve closedPositions, but only if they exist

    if (Object.prototype.hasOwnProperty.call(position, 'closedPositions')) {
      newPositions.get(instrument).closedPositions = position.closedPositions;
    }
  });
  return newPositions;
}
//# sourceMappingURL=calculatePositionsValues.mjs.map