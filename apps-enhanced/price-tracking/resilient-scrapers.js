/**
 * Resilient Scrapers
 * Wraps all price tracking scrapers with production-grade resilience patterns
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
  // Scraping operations (can be slow and unreliable)
  timeout: {
    quick: 10000,         // 10 seconds for API scrapes
    standard: 30000,      // 30 seconds for page loads
    slow: 60000,          // 60 seconds for heavy scraping
    verySlow: 120000      // 2 minutes for anti-detection measures
  },

  // Retry configuration (more retries for scraping)
  retry: {
    maxRetries: 5,        // More retries for transient failures
    baseDelay: 2000,      // 2 seconds base delay
    maxDelay: 30000      // 30 seconds max delay
  },

  // Circuit breaker configuration (more tolerant)
  circuitBreaker: {
    threshold: 10,        // Open after 10 failures (scrapers fail often)
    timeout: 120000,     // Try again after 2 minutes
    halfOpenMaxCalls: 5   // Try 5 calls in HALF_OPEN state
  }
};

// ============================================================================
// WRAPPER FUNCTIONS
// ============================================================================

/**
 * Wrap a scraping operation with resilience
 */
function wrapScrapingOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: config.name || 'Scraper',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: config.timeout || RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

/**
 * Create a fallback chain for scraping (try multiple methods)
 */
async function scrapeWithFallbacks(primary, fallbacks, options = {}) {
  const operations = [primary, ...fallbacks];

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await wrapScrapingOperation(operations[i], {
        name: `${options.name}_fallback_${i}`,
        timeout: options.timeout || RESILIENCE_CONFIG.timeout.slow
      })();

      // Mark which fallback succeeded
      if (i > 0) {
        console.log(`${options.name}: Used fallback ${i}`);
      }

      return {
        success: true,
        method: i,
        data: result
      };
    } catch (error) {
      console.error(`${options.name}: Fallback ${i} failed:`, error.message);
      // Continue to next fallback
    }
  }

  throw new Error(`${options.name}: All scraping methods failed`);
}

// ============================================================================
// RESILIENT SCRAPER CLASSES
// ============================================================================

class ResilientScraper {
  constructor(scraper, name) {
    this.scraper = scraper;
    this.name = name;
    this._circuitBreaker = null;
  }

  async scrape(url, options = {}) {
    return wrapScrapingOperation(
      () => this.scraper.scrape(url, options),
      {
        name: this.name,
        timeout: options.timeout || RESILIENCE_CONFIG.timeout.slow
      }
    )();
  }

  async search(query, options = {}) {
    return wrapScrapingOperation(
      () => this.scraper.search(query, options),
      {
        name: this.name,
        timeout: options.timeout || RESILIENCE_CONFIG.timeout.standard
      }
    )();
  }

  async checkAvailability(url, options = {}) {
    return wrapScrapingOperation(
      () => this.scraper.checkAvailability(url, options),
      {
        name: this.name,
        timeout: options.timeout || RESILIENCE_CONFIG.timeout.quick
      }
    )();
  }
}

// ============================================================================
// HEALTH CHECKING
// ============================================================================

const circuitBreakers = {
  Amazon: null,
  Flipkart: null,
  Myntra: null
};

function getHealthStatus() {
  return {
    scrapers: {
      amazon: circuitBreakers.Amazon?.getState() || 'not_configured',
      flipkart: circuitBreakers.Flipkart?.getState() || 'not_configured',
      myntra: circuitBreakers.Myntra?.getState() || 'not_configured'
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Wrappers
  wrapScrapingOperation,
  scrapeWithFallbacks,

  // Resilient Scraper Class
  ResilientScraper,

  // Factory function
  createResilientScraper(scraper, name) {
    return new ResilientScraper(scraper, name);
  },

  // Configuration
  RESILIENCE_CONFIG,

  // Health Monitoring
  getHealthStatus,
  circuitBreakers
};
