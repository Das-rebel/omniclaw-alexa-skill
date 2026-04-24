/**
 * Stub retry function
 */
function retryWithBackoff(fn, options = {}) {
  return fn();
}

module.exports = { retryWithBackoff };
