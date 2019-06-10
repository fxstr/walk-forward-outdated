/**
 * Calculates price for a position
 * @param  {number} price     Current price
 * @param  {number} openPrice Price instrument had when position was opened
 * @param  {number} size      Size of the position
 * @return {number}           Current value of the position
 */
export default function calculatePositionValue(price, openPrice, size) {
  // If we're short, subtract current loss from original price
  return size < 0 ? (openPrice + (openPrice - price)) * Math.abs(size) : price * size;
}
//# sourceMappingURL=calculatePositionValue.mjs.map