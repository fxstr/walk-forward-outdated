/**
 *  Executes the algorithms passed in one after another:
 *  - Calls methodName on first algorithm with arguments
 *  - Then calls methodName on second algorithm with arguments *but* replaces the first argument
 *    with the return value of the previous function
 *  - etc.
 *  @param {object[]} algorithms - Algorithms to call methodName on
 *  @param {string} methodName - Method to call on every algorithm
 *  @param {array} arguments - Arguments to pass to the the first algorithm
 *  @param {bool} suppressAlgorithmErrors - Dont throw an error if method on an algorithm is missing
 *                                        or not a function, just execute the next method in
 *                                        algorithm stack
 *  @param {bool} useReturnValueAsFirstArgumentForSubsequentMethodCalls - If set to true, uses
 *                                                  return value of previous method call as first
 *                                                  argument for next call
 *  @returns {*} - Result of the call of methodName on the ultimate algorithm
 */
export default async function executeAlgorithmsSerially(algorithms, methodName, args, suppressAlgorithmErrors = false, useReturnValueAsFirstArgumentForSubsequentMethodCalls = false) {
  // Check arguments
  if (!Array.isArray(algorithms)) {
    throw new Error(`executeAlgorithmsSerially: Algorithms passed in must be an array, are ${JSON.stringify(args)}`);
  }

  if (typeof methodName !== 'string') {
    throw new Error(`executeAlgorithmsSerially: Method name passed in must be an string, is ${JSON.stringify(args)}`);
  }

  if (!Array.isArray(args)) {
    throw new Error(`executeAlgorithmsSerially: Arguments passed in must be an array, are ${JSON.stringify(args)}`);
  } // Arguments may change with every function call as we replace the first argument with the
  // return value of the previously called methodName (when useReturnValueAsNewFirstArgument is
  // true)


  let updatedArguments = args.slice(0); // Store the return value of every function call, return it at the end.

  let result;

  for (const algorithm of algorithms) {
    // Check algorithms
    if (typeof algorithm !== 'object') {
      if (suppressAlgorithmErrors) continue;
      throw new Error(`executeAlgorithmsSerially: Algorthm ${JSON.stringify(algorithm)} is not an object.`);
    }

    if (typeof algorithm[methodName] !== 'function') {
      if (suppressAlgorithmErrors) continue;
      throw new Error(`executeAlgorithmsSerially: Algorithm ${algorithm.constructor.name} does not have a method ${methodName}.`);
    }

    result = await algorithm[methodName](...updatedArguments); // Update arguments for next iteration; return value of the previous methodCall becomes
    // the first argument, others are preserved. Make sure to not modify any existing data.

    if (useReturnValueAsFirstArgumentForSubsequentMethodCalls) {
      updatedArguments = [result, ...updatedArguments.slice(1)];
    }
  } // At the end, return the return value of the ultimate call to methodName.


  return result;
}
//# sourceMappingURL=executeAlgorithmsSerially.mjs.map