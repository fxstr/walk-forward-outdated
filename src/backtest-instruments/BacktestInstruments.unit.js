// See https://github.com/babel/babel/issues/4639#issuecomment-251148172: 
// Async generators can only be tested by requiring babel-poylfill, which is not hoisted when
// using require. Therefore we must also use require to load the tests.

require('babel-polyfill');
require('./BacktestInstruments.require.js');