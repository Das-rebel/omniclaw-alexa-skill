/**
 * Flipkart Price Scraper
 *
 * Extracts product prices, flash sales, and availability from Flipkart
 * Uses mobile-first approach to avoid desktop bot detection
 */

const BaseScraper = require('./base-scraper');
const platformConfig = require('../config/platforms').flipkart;
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('FlipkartScraper');

class FlipkartScraper extends BaseScraper {
  constructor() {
    super('flipkart', platformConfig);
  }

  /**
   * Scrape product data from Flipkart URL
   * @param {string} url - Flipkart product URL
   * @returns {Object} - Product data with price, availability, etc.
   */
  async scrapeProduct(url) {
    await this.initBrowser();

    try {
      logger.info(`Scraping Flipkart product: ${url}`);

      await this.navigateToUrl(url);

      // Wait for page to load
      await this.page.waitForTimeout(3000);

      // Extract product data
      const productData = {
        productId: this.extractProductId(url),
        url,
        platform: 'flipkart',
        timestamp: Date.now(),

        // Basic info
        title: await this.extractTitle(),
        price: await this.extractPrice(),
        currency: 'INR',
        availability: await this.checkAvailability(),

        // Metadata
        metadata: {
          rating: await this.extractRating(),
          reviewCount: await this.extractReviewCount(),
          flashSale: await this.isFlashSale(),
          originalPrice: await this.extractOriginalPrice(),
          discount: await this.extractDiscount(),
          exchangeOffer: await this.hasExchangeOffer(),
          emi: await this.hasEMI()
        }
      };

      // Validate extracted data
      if (!productData.price) {
        throw new Error('Failed to extract price from page');
      }

      logger.info(`Successfully scraped product: ${productData.title} - ${productData.price}`);
      return productData;

    } catch (error) {
      logger.error(`Error scraping Flipkart product: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Extract product ID from URL
   */
  extractProductId(url) {
    const match = url.match(/\/p\/([a-z0-9]+)/i);
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
   * Check product availability
   */
  async checkAvailability() {
    try {
      // Check if out of stock message exists
      const outOfStock = await this.elementExists([
        '._16FRp0',
        '.loader-section'
      ]);

      return !outOfStock;
    } catch (error) {
      return true;
    }
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
      const reviewText = await this.extractText(['._2LRCXY', '._3LWZlK']);
      if (!reviewText) return null;

      const match = reviewText.match(/([\d,]+)\s*ratings?/i);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''));
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if product is in flash sale
   */
  async isFlashSale() {
    return await this.elementExists(this.config.selectors.flashSale);
  }

  /**
   * Extract original price (before discount)
   */
  async extractOriginalPrice() {
    try {
      const originalPriceText = await this.extractText([
        '._3au_Q3',
        '._3RWqSY'
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
      const discountText = await this.extractText(this.config.selectors.discount);

      if (!discountText) return null;

      const match = discountText.match(/(\d+)%/);
      return match ? parseInt(match[1]) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if product has exchange offer
   */
  async hasExchangeOffer() {
    try {
      return await this.elementExists(['._2eZ2jh', '.exchange-offer']);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if EMI is available
   */
  async hasEMI() {
    try {
      return await this.elementExists(['._2kUK18', '.emi-available']);
    } catch (error) {
      return false;
    }
  }

  /**
   * Scrape flash sale products
   * @returns {Array} - List of flash sale products
   */
  async scrapeFlashSales(category = 'all') {
    await this.initBrowser();

    try {
      logger.info(`Scraping Flipkart flash sales for category: ${category}`);

      const saleUrl = category === 'all'
        ? 'https://www.flipkart.com/mobile-phones-store?otracker=nmenu_sub_Electronics_0_Mobiles'
        : `https://www.flipkart.com/${category}-store`;

      await this.navigateToUrl(saleUrl);
      await this.page.waitForTimeout(3000);

      // Extract product cards
      const products = await this.page.evaluate(() => {
        const cards = document.querySelectorAll('._1AtVbE');
        return Array.from(cards).map(card => {
          const link = card.querySelector('a._1fQZEK');
          const title = card.querySelector('a.IRpwTa');
          const price = card.querySelector('._30jeq3');
          const originalPrice = card.querySelector('._3au_Q3');
          const discount = card.querySelector('._3Ay6Sb');
          const rating = card.querySelector('._2LRCXY');

          return {
            url: link ? link.href : null,
            title: title ? title.textContent.trim() : null,
            price: price ? price.textContent.trim() : null,
            originalPrice: originalPrice ? originalPrice.textContent.trim() : null,
            discount: discount ? discount.textContent.trim() : null,
            rating: rating ? rating.textContent.trim() : null
          };
        });
      });

      const validProducts = products.filter(p => p.url && p.price);
      logger.info(`Found ${validProducts.length} flash sale products`);

      return validProducts;

    } catch (error) {
      logger.error(`Error scraping flash sales: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }
}

module.exports = FlipkartScraper;
