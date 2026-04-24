/**
 * Base Scraper Class
 *
 * Provides common functionality for all platform scrapers:
 * - Resilience layer integration
 * - Anti-detection measures
 * - Rate limiting
 * - Error handling
 */

const { createResilientFunction } = require('../../../shared/resilience');
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('BaseScraper');

class BaseScraper {
  constructor(platform, config) {
    this.platform = platform;
    this.config = config;
    this.browser = null;
    this.page = null;
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Initialize browser with anti-detection settings
   */
  async initBrowser() {
    const playwright = require('playwright');
    const stealth = this.config.stealth || {};

    const launchOptions = {
      headless: stealth.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };

    // Choose browser based on platform
    const browserType = stealth.mobile ? 'webkit' : 'chromium';

    this.browser = await playwright[browserType].launch(launchOptions);
    this.page = await this.browser.newPage({
      userAgent: this.config.userAgent,
      viewport: stealth.mobile ? { width: 375, height: 667 } : { width: 1920, height: 1080 }
    });

    // Set custom headers
    if (stealth.customHeaders) {
      await this.page.setExtraHTTPHeaders(stealth.customHeaders);
    }

    // Block images if configured
    if (stealth.blockImages) {
      await this.page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', route => route.abort());
    }

    // Block specific scripts
    if (stealth.blockScripts) {
      for (const pattern of stealth.blockScripts) {
        await this.page.route(pattern, route => route.abort());
      }
    }

    logger.info(`Browser initialized for ${this.platform}`);
  }

  /**
   * Rate limiting before requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 60000 / this.config.rateLimit.default;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    // Reset counter if window expired
    if (this.requestCount > this.config.rateLimit.burst) {
      await new Promise(resolve => setTimeout(resolve, 60000));
      this.requestCount = 0;
    }
  }

  /**
   * Navigate to URL with resilience
   */
  async navigateToUrl(url) {
    await this.enforceRateLimit();

    const navigate = createResilientFunction(
      async (url) => {
        const response = await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        if (!response.ok()) {
          throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
        }

        return response;
      },
      {
        name: `${this.platform}-navigate`,
        timeout: 30000,
        maxRetries: 3
      }
    );

    return navigate(url);
  }

  /**
   * Extract text content from selectors
   */
  async extractText(selectors) {
    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (error) {
        // Selector not found, try next
        continue;
      }
    }
    return null;
  }

  /**
   * Extract attribute from selectors
   */
  async extractAttribute(selectors, attribute) {
    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const attr = await element.getAttribute(attribute);
          if (attr) {
            return attr;
          }
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  /**
   * Check if element exists
   */
  async elementExists(selectors) {
    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  /**
   * Clean and parse price string
   */
  parsePrice(priceText) {
    if (!priceText) return null;

    // Remove currency symbols, commas, spaces
    const cleaned = priceText
      .replace(/[₹$€£¥,]/g, '')
      .replace(/\s/g, '')
      .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse rating text
   */
  parseRating(ratingText) {
    if (!ratingText) return null;

    const match = ratingText.match(/([\d.]+)\s*out\s*of\s*5/i);
    if (match) {
      return parseFloat(match[1]);
    }

    const parsed = parseFloat(ratingText);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info(`Browser closed for ${this.platform}`);
    }
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  async scrapeProduct(url) {
    throw new Error('scrapeProduct() must be implemented by subclass');
  }
}

module.exports = BaseScraper;
