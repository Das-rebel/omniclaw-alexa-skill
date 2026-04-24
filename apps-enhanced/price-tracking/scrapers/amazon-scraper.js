/**
 * Amazon Price Scraper
 *
 * Extracts product prices, lightning deals, and availability from Amazon
 * Uses stealth techniques to avoid detection
 */

const BaseScraper = require('./base-scraper');
const platformConfig = require('../config/platforms').amazon;
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('AmazonScraper');

class AmazonScraper extends BaseScraper {
  constructor() {
    super('amazon', platformConfig);
  }

  /**
   * Scrape product data from Amazon URL
   * @param {string} url - Amazon product URL
   * @returns {Object} - Product data with price, availability, etc.
   */
  async scrapeProduct(url) {
    await this.initBrowser();

    try {
      logger.info(`Scraping Amazon product: ${url}`);

      await this.navigateToUrl(url);

      // Wait for price to load
      await this.page.waitForTimeout(2000);

      // Extract product data
      const productData = {
        productId: this.extractProductId(url),
        url,
        platform: 'amazon',
        timestamp: Date.now(),

        // Basic info
        title: await this.extractTitle(),
        price: await this.extractPrice(),
        currency: await this.extractCurrency(),
        availability: await this.checkAvailability(),

        // Metadata
        metadata: {
          rating: await this.extractRating(),
          reviewCount: await this.extractReviewCount(),
          lightningDeal: await this.isLightningDeal(),
          prime: await this.isPrime(),
          originalPrice: await this.extractOriginalPrice(),
          discount: await this.extractDiscount(),
          coupon: await this.hasCoupon()
        }
      };

      // Validate extracted data
      if (!productData.price && !productData.metadata.originalPrice) {
        throw new Error('Failed to extract price from page');
      }

      logger.info(`Successfully scraped product: ${productData.title} - ${productData.price}`);
      return productData;

    } catch (error) {
      logger.error(`Error scraping Amazon product: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Extract product ID from URL
   */
  extractProductId(url) {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/i);
    return match ? match[1] : null;
  }

  /**
   * Extract product title
   */
  async extractTitle() {
    const title = await this.extractText(this.config.selectors.title);
    return title || 'Unknown Product';
  }

  /**
   * Extract current price
   */
  async extractPrice() {
    const priceText = await this.extractText(this.config.selectors.price);
    return this.parsePrice(priceText);
  }

  /**
   * Extract currency symbol
   */
  async extractCurrency() {
    const priceText = await this.extractText(this.config.selectors.price);
    if (!priceText) return 'USD';

    if (priceText.includes('₹')) return 'INR';
    if (priceText.includes('$')) return 'USD';
    if (priceText.includes('€')) return 'EUR';
    if (priceText.includes('£')) return 'GBP';

    return 'USD';
  }

  /**
   * Check product availability
   */
  async checkAvailability() {
    const availabilityText = await this.extractText(this.config.selectors.availability);

    if (!availabilityText) return true;

    const unavailable = /out of stock|unavailable|currently unavailable/i;
    return !unavailable.test(availabilityText);
  }

  /**
   * Extract product rating
   */
  async extractRating() {
    const ratingText = await this.extractText(this.config.selectors.rating);
    return this.parseRating(ratingText);
  }

  /**
   * Extract number of reviews
   */
  async extractReviewCount() {
    try {
      const ratingText = await this.extractText(this.config.selectors.rating);
      if (!ratingText) return null;

      const match = ratingText.match(/([\d,]+)\s*ratings?/i);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''));
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if product is a lightning deal
   */
  async isLightningDeal() {
    return await this.elementExists(this.config.selectors.lightningDeal);
  }

  /**
   * Check if product has Prime
   */
  async isPrime() {
    return await this.elementExists(this.config.selectors.prime);
  }

  /**
   * Extract original price (before discount)
   */
  async extractOriginalPrice() {
    try {
      // Try to find strikethrough price
      const originalPriceText = await this.extractText([
        '#priceblock_ourprice_row .a-text-strike',
        '.a-text-strike',
        '#priceBlockStrikePrice'
      ]);
      return this.parsePrice(originalPriceText);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract discount percentage
   */
  async extractDiscount() {
    try {
      const discountText = await this.extractText([
        '.savingsPercentage',
        '.dealPriceText'
      ]);

      if (!discountText) return null;

      const match = discountText.match(/(\d+)%/);
      return match ? parseInt(match[1]) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if product has coupon
   */
  async hasCoupon() {
    try {
      return await this.elementExists([
        '.promoPriceBlockMessage',
        '.couponBadge'
      ]);
    } catch (error) {
      return false;
    }
  }

  /**
   * Scrape lightning deals page
   * @returns {Array} - List of lightning deal products
   */
  async scrapeLightningDeals(category = 'all') {
    await this.initBrowser();

    try {
      logger.info(`Scraping Amazon lightning deals for category: ${category}`);

      const dealUrl = category === 'all'
        ? 'https://www.amazon.com/gp/goldbox'
        : `https://www.amazon.com/gp/goldbox/ref=gbps_fet_s_gbd_${category}`;

      await this.navigateToUrl(dealUrl);
      await this.page.waitForTimeout(3000);

      // Extract deal cards
      const deals = await this.page.evaluate(() => {
        const dealCards = document.querySelectorAll('[data-component-type="s-search-result"]');
        return Array.from(dealCards).map(card => {
          const link = card.querySelector('a.a-link-normal');
          const title = card.querySelector('h2 a span');
          const price = card.querySelector('.a-price .a-offscreen');
          const originalPrice = card.querySelector('.a-text-strike');
          const discount = card.querySelector('.a-size-base.a-color-price');

          return {
            url: link ? link.href : null,
            title: title ? title.textContent.trim() : null,
            price: price ? price.textContent.trim() : null,
            originalPrice: originalPrice ? originalPrice.textContent.trim() : null,
            discount: discount ? discount.textContent.trim() : null
          };
        });
      });

      const validDeals = deals.filter(deal => deal.url && deal.price);
      logger.info(`Found ${validDeals.length} lightning deals`);

      return validDeals;

    } catch (error) {
      logger.error(`Error scraping lightning deals: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }
}

module.exports = AmazonScraper;
