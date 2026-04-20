/**
 * Logging Subscriber - Logs all hook events to file
 * Part of PAI Control Plane Overlay
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.PAI_LOG_DIR || path.join(process.env.HOME, '.claude', 'omniclaw', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'hooks.log');

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Format log entry
 */
function formatEntry(payload) {
  const { hook, timestamp, data } = payload;
  const truncatedData = JSON.stringify(data, null, 2);
  return `[${timestamp}] ${hook.toUpperCase()}\n${truncatedData}\n`;
}

/**
 * Create logging subscriber
 * @param {Object} options
 * @param {boolean} options.enabled - Enable logging (default: true)
 * @param {string} options.logFile - Custom log file path
 * @returns {Function} Subscriber handler
 */
function createLoggingSubscriber(options = {}) {
  const {
    enabled = true,
    logFile = LOG_FILE
  } = options;

  return async (payload) => {
    if (!enabled) return;

    try {
      ensureLogDir();
      const entry = formatEntry(payload);
      fs.appendFileSync(logFile, entry);
    } catch (err) {
      console.error('Failed to write hook log:', err.message);
    }
  };
}

/**
 * Register all logging subscribers on a hook bus
 */
function registerLogging(hookBus) {
  const handlers = {};

  for (const hookName of ['on_start', 'on_exit', 'on_error', 'on_tool_use', 'on_message', 'on_plan', 'on_execute', 'on_learn']) {
    handlers[hookName] = createLoggingSubscriber();
    hookBus.subscribe(hookName, handlers[hookName]);
  }

  return handlers;
}

module.exports = {
  createLoggingSubscriber,
  registerLogging,
  LOG_DIR,
  LOG_FILE
};
