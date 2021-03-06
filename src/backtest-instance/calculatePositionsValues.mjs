import calculatePositionValue from './calculatePositionValue';
import logger from '../logger/logger';

const { debug } = logger('WalkForward:calculatePositionsValues');

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

        const subPositions = position.positions.map((subPosition) => {
            const clonedSubPosition = { ...subPosition };
            // If no price is available, position is unchanged
            if (prices.has(instrument)) {
                clonedSubPosition.value = calculatePositionValue(
                    prices.get(instrument),
                    subPosition.openPrice,
                    subPosition.size,
                );
            }
            return clonedSubPosition;
        });

        debug('new subPositions are %o', subPositions);

        newPositions.set(instrument, {
            value: subPositions.reduce((prev, subPos) => prev + subPos.value, 0),
            size: position.size,
            positions: subPositions,
        });

        // Preserve closedPositions, but only if they exist
        if (Object.prototype.hasOwnProperty.call(position, 'closedPositions')) {
            newPositions.get(instrument).closedPositions = position.closedPositions;
        }

    });

    return newPositions;

}
