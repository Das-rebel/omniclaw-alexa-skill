/**
 * Email Intelligence Logger
 *
 * Centralized logging for all email operations
 */

const winston = require('winston');
const config = require('../config/email-config');

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'email-intelligence' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport if not in development
if (process.env.NODE_ENV !== 'development') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}

/**
 * Log email operation with structured data
 */
function logEmailOperation(operation, data) {
  logger.info({
    type: 'email_operation',
    operation,
    ...data
  });
}

/**
 * log agent activity
 */
function logAgentActivity(agent, action, data) {
  logger.info({
    type: 'agent_activity',
    agent,
    action,
    ...data
  });
}

/**
 * Log API call
 */
function logApiCall(provider, endpoint, duration, success) {
  logger.info({
    type: 'api_call',
    provider,
    endpoint,
    duration,
    success
  });
}

module.exports = {
  logger,
  logEmailOperation,
  logAgentActivity,
  logApiCall
};
