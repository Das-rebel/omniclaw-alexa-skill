/**
 * Price Tracking Module Entry Point
 *
 * Main module for price tracking functionality
 * Exports all scrapers, processors, and notifiers
 */

// Scrapers
const AmazonScraper = require('../scrapers/amazon-scraper');
const FlipkartScraper = require('../scrapers/flipkart-scraper');
const MyntraScraper = require('../scrapers/myntra-scraper');
const { getScraperForUrl, scrapeProduct, batchScrape, scrapeDeals } = require('../scrapers/scraper-factory');

// Resilience wrappers
const { createResilientScraper, scrapeWithFallbacks } = require('../resilient-scrapers');

// Processors
const { getPublisher } = require('../processors/redis-publisher');
const PriceAnalyzer = require('../processors/price-analyzer');

// Notifiers
const AlexaNotifier = require('../notifiers/alexa-notifier');
const NotificationService = require('../notifiers/notification-service');

// Configuration
const platformConfig = require('../config/platforms');
const redisConfig = require('../config/redis');

/**
 * Price Tracking API
 */
class PriceTracking {
  constructor() {
    this.publishers = {
      redis: null
    };
    this.services = {
      analyzer: null,
      notifier: null
    };
  }

  /**
   * Initialize price tracking system
   */
  async initialize() {
    const { Logger } = require('../../../shared/monitoring/logger');
    const logger = new Logger('PriceTracking');

    try {
      logger.info('Initializing Price Tracking system');

      // Initialize Redis publisher
      this.publishers.redis = getPublisher();
      await this.publishers.redis.connect();

      logger.info('✅ Price Tracking system initialized');

      return this;
    } catch (error) {
      logger.error(`Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add product to track
   * @param {Object} options - Tracking options
   */
  async trackProduct(options) {
    const { url, priority = 5, checkInterval = 3600000, thresholds = {} } = options;

    const publisher = getPublisher();
    await publisher.connect();

    await publisher.publishPriceCheck({
      url,
      priority,
      checkInterval,
      thresholds
    });

    await publisher.disconnect();

    return { success: true, message: 'Product added to tracking' };
  }

  /**
   * Get current price for product with resilience
   * @param {string} url - Product URL
   */
  async getCurrentPrice(url) {
    // Get base scraper
    const baseScraper = getScraperForUrl(url);

    // Wrap with resilience
    const resilientScraper = createResilientScraper(baseScraper, 'PriceTracker');

    // Scrape with fallbacks
    return await resilientScraper.scrape(url);
  }

  /**
   * Start analyzer service
   */
  startAnalyzer() {
    this.services.analyzer = new PriceAnalyzer();
    this.services.analyzer.start();
    return this.services.analyzer;
  }

  /**
   * Start notification service
   */
  startNotifier() {
    this.services.notifier = new NotificationService();
    this.services.notifier.start();
    return this.services.notifier;
  }

  /**
   * Stop all services
   */
  async stop() {
    if (this.services.analyzer) {
      await this.services.analyzer.stop();
    }

    if (this.services.notifier) {
      await this.services.notifier.stop();
    }

    if (this.publishers.redis) {
      await this.publishers.redis.disconnect();
    }
  }
}

// Export all components
module.exports = {
  // Main API
  PriceTracking,

  // Scrapers
  AmazonScraper,
  FlipkartScraper,
  MyntraScraper,
  scrapeProduct,
  batchScrape,
  scrapeDeals,
  getScraperForUrl,

  // Resilience wrappers
  createResilientScraper,
  scrapeWithFallbacks,

  // Processors
  getPublisher,
  PriceAnalyzer,

  // Notifiers
  AlexaNotifier,
  NotificationService,

  // Configuration
  platformConfig,
  redisConfig
};
