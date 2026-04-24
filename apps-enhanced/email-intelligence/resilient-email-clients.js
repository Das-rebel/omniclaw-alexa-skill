/**
 * Resilient Email Clients
 * Wraps all email service clients with production-grade resilience patterns
 */

const {
  withTimeout,
  retryWithBackoff,
  CircuitBreaker,
  createResilientFunction
} = require('../../openclaw-alexa-bridge/resilience');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESILIENCE_CONFIG = {
  // Email API timeouts (can be slow)
  timeout: {
    standard: 10000,      // 10 seconds for normal operations
    slow: 30000,          // 30 seconds for large attachments
    verySlow: 60000       // 60 seconds for batch operations
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  },

  // Circuit breaker configuration
  circuitBreaker: {
    threshold: 5,        // Open after 5 failures
    timeout: 60000,      // Try again after 60 seconds
    halfOpenMaxCalls: 3  // Try 3 calls in HALF_OPEN state
  }
};

// ============================================================================
// WRAPPER FUNCTIONS
// ============================================================================

/**
 * Wrap a Gmail API call with resilience
 */
function wrapGmailOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: 'GmailAPI',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

/**
 * Wrap an Outlook API call with resilience
 */
function wrapOutlookOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: 'OutlookAPI',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

/**
 * Wrap an AWS SES call with resilience
 */
function wrapSESOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: 'AWSSES',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

// ============================================================================
// RESILIENT CLIENTS
// ============================================================================

class ResilientGmailService {
  constructor(gmailService) {
    this.gmailService = gmailService;
    this._name = 'GmailService';
  }

  async fetchEmails(options = {}) {
    return wrapGmailOperation(
      () => this.gmailService.fetchEmails(options),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async getEmail(messageId) {
    return wrapGmailOperation(
      () => this.gmailService.getEmail(messageId),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async sendEmail(email) {
    return wrapGmailOperation(
      () => this.gmailService.sendEmail(email),
      { timeout: RESILIENCE_CONFIG.timeout.slow }
    )();
  }

  async modifyEmail(messageId, modifications) {
    return wrapGmailOperation(
      () => this.gmailService.modifyEmail(messageId, modifications),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  // Forward all other methods to original service
  [key](...args) {
    if (typeof this.gmailService[key] === 'function') {
      return wrapGmailOperation(
        () => this.gmailService[key](...args),
        { timeout: RESILIENCE_CONFIG.timeout.standard }
      )();
    }
    return this.gmailService[key];
  }
}

class ResilientOutlookService {
  constructor(outlookService) {
    this.outlookService = outlookService;
    this._name = 'OutlookService';
  }

  async fetchMessages(options = {}) {
    return wrapOutlookOperation(
      () => this.outlookService.fetchMessages(options),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async getMessage(messageId) {
    return wrapOutlookOperation(
      () => this.outlookService.getMessage(messageId),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async sendMessage(message) {
    return wrapOutlookOperation(
      () => this.outlookService.sendMessage(message),
      { timeout: RESILIENCE_CONFIG.timeout.slow }
    )();
  }

  // Forward all other methods
  [key](...args) {
    if (typeof this.outlookService[key] === 'function') {
      return wrapOutlookOperation(
        () => this.outlookService[key](...args),
        { timeout: RESILIENCE_CONFIG.timeout.standard }
      )();
    }
    return this.outlookService[key];
  }
}

// ============================================================================
// HEALTH CHECKING
// ============================================================================

const circuitBreakers = {
  GmailAPI: null,
  OutlookAPI: null,
  AWSSES: null
};

function getHealthStatus() {
  return {
    email: {
      gmail: circuitBreakers.GmailAPI?.getState() || 'not_configured',
      outlook: circuitBreakers.OutlookAPI?.getState() || 'not_configured',
      ses: circuitBreakers.AWSSES?.getState() || 'not_configured'
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Wrappers
  wrapGmailOperation,
  wrapOutlookOperation,
  wrapSESOperation,

  // Resilient Client Classes
  ResilientGmailService,
  ResilientOutlookService,

  // Configuration
  RESILIENCE_CONFIG,

  // Health Monitoring
  getHealthStatus,
  circuitBreakers
};
