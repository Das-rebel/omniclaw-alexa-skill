/**
 * Metrics Subscriber - Track hook event metrics
 * Part of PAI Control Plane Overlay
 */

const metrics = {
  counts: {},
  errors: [],
  lastHook: {}
};

/**
 * Reset all metrics
 */
function reset() {
  metrics.counts = {};
  metrics.errors = [];
  metrics.lastHook = {};
}

/**
 * Get current metrics snapshot
 */
function getMetrics() {
  return {
    ...metrics,
    totalEvents: Object.values(metrics.counts).reduce((a, b) => a + b, 0)
  };
}

/**
 * Create metrics subscriber
 * @param {Object} options
 * @param {number} options.maxErrors - Max errors to track (default: 100)
 * @returns {Function} Subscriber handler
 */
function createMetricsSubscriber(options = {}) {
  const { maxErrors = 100 } = options;

  return async (payload) => {
    const { hook, timestamp } = payload;

    // Count by hook type
    metrics.counts[hook] = (metrics.counts[hook] || 0) + 1;
    metrics.lastHook[hook] = timestamp;

    // Track errors separately
    if (hook === 'on_error' && payload.data?.error) {
      metrics.errors.push({
        error: payload.data.error,
        timestamp,
        context: payload.data
      });
      if (metrics.errors.length > maxErrors) {
        metrics.errors.shift();
      }
    }
  };
}

/**
 * Register metrics subscribers on a hook bus
 */
function registerMetrics(hookBus) {
  const handlers = {};

  for (const hookName of ['on_start', 'on_exit', 'on_error', 'on_tool_use', 'on_message', 'on_plan', 'on_execute', 'on_learn']) {
    handlers[hookName] = createMetricsSubscriber();
    hookBus.subscribe(hookName, handlers[hookName]);
  }

  return handlers;
}

module.exports = {
  createMetricsSubscriber,
  registerMetrics,
  getMetrics,
  reset,
  metrics
};
