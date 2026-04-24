/**
 * Scraper Factory
 *
 * Creates appropriate scraper instance based on product URL
 * Handles platform detection and scraper initialization
 */

const { getPlatformByUrl } = require('../config/platforms');
const AmazonScraper = require('./amazon-scraper');
const FlipkartScraper = require('./flipkart-scraper');
const MyntraScraper = require('./myntra-scraper');
const { Logger } = require('../../../shared/monitoring/logger');

const logger = new Logger('ScraperFactory');

/**
 * Get scraper instance for URL
 * @param {string} url - Product URL
 * @returns {BaseScraper} - Platform-specific scraper instance
 */
function getScraperForUrl(url) {
  const platform = getPlatformByUrl(url);

  if (!platform) {
    throw new Error(`Unsupported platform for URL: ${url}`);
  }

  logger.info(`Creating ${platform.name} scraper for: ${url}`);

  switch (platform.key) {
    case 'amazon':
      return new AmazonScraper();
    case 'flipkart':
      return new FlipkartScraper();
    case 'myntra':
      return new MyntraScraper();
    default:
      throw new Error(`No scraper implemented for platform: ${platform.key}`);
  }
}

/**
 * Scrape product from URL (factory method)
 * @param {string} url - Product URL
 * @returns {Promise<Object>} - Product data
 */
async function scrapeProduct(url) {
  const scraper = getScraperForUrl(url);
  return await scraper.scrapeProduct(url);
}

/**
 * Batch scrape multiple products
 * @param {Array<string>} urls - Array of product URLs
 * @param {number} concurrency - Number of concurrent scrapes (default: 3)
 * @returns {Promise<Array<Object>>} - Array of product data
 */
async function batchScrape(urls, concurrency = 3) {
  logger.info(`Batch scraping ${urls.length} products with concurrency ${concurrency}`);

  const results = [];
  const errors = [];

  // Process in batches to avoid overwhelming servers
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(async (url) => {
      try {
        const data = await scrapeProduct(url);
        return { success: true, data, url };
      } catch (error) {
        logger.error(`Failed to scrape ${url}: ${error.message}`);
        return { success: false, error, url };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(result => {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({ url: result.url, error: result.error.message });
      }
    });

    // Delay between batches
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  logger.info(`Batch scraping complete: ${results.length} successful, ${errors.length} failed`);

  return {
    successful: results,
    failed: errors,
    total: urls.length
  };
}

/**
 * Get platform-specific sale/deal products
 * @param {string} platform - Platform name (amazon, flipkart, myntra)
 * @param {string} category - Category or 'all'
 * @returns {Promise<Array<Object>>} - Array of deal products
 */
async function scrapeDeals(platform, category = 'all') {
  logger.info(`Scraping deals for platform: ${platform}, category: ${category}`);

  let scraper;
  switch (platform.toLowerCase()) {
    case 'amazon':
      scraper = new AmazonScraper();
      return await scraper.scrapeLightningDeals(category);
    case 'flipkart':
      scraper = new FlipkartScraper();
      return await scraper.scrapeFlashSales(category);
    case 'myntra':
      scraper = new MyntraScraper();
      return await scraper.scrapeSale(category);
    default:
      throw new Error(`No deal scraper implemented for platform: ${platform}`);
  }
}

module.exports = {
  getScraperForUrl,
  scrapeProduct,
  batchScrape,
  scrapeDeals
};
