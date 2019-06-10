export default new Map([['cash', {
  test: value => typeof value === 'number',
  testFailedMessage: 'is not a number',
  default: 1000,
  optional: true
}], ['startDate', {
  test: value => value instanceof Date,
  testFailedMessage: 'is not a valid instance of Date',
  optional: true
}], ['endDate', {
  test: value => value instanceof Date,
  testFailedMessage: 'is not a valid instance of Date',
  optional: true
}]]);
//# sourceMappingURL=backtestConfigTemplate.mjs.map