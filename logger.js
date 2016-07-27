'use strict';

const moment = require('moment');
const colors = require('colors');

let error = (...args) => {
  args.unshift('E:');
  console.error.apply(console, args);
  process.exit(1);
}

let log = (...args) => {
  args.unshift(moment().format('LLLL').blue + ' [i] ');
  console.log.apply(console, args);
}

module.exports = {
  log: log,
  erorr: error
}
