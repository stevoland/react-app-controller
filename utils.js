"use strict";

/**
 * If object is a string
 *
 * @param {Object} obj
 */
function isString(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
}

function extend(a, b) {
  var result = {};

  for (var k in a)
    result[k] = a[k];

  for (var k in b)
    result[k] = b[k];

  return result;
}

module.exports = {
  isString: isString,
  extend: extend
};
