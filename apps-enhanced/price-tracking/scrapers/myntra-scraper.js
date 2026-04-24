/**
 * Myntra Price Scraper
 *
 * Extracts fashion product prices, sizes, and availability from Myntra
 * Specialized for fashion e-commerce with size/color variants
 */

const BaseScraper = require('./base-scraper');
const platformConfig = require('../config/platforms').myntra;
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('MyntraScraper');

class MyntraScraper extends BaseScraper {
  constructor() {
    super('myntra', platformConfig);
  }

  /**
   * Scrape product data from Myntra URL
   * @param {string} url - Myntra product URL
   * @returns {Object} - Product data with price, availability, sizes, etc.
   */
  async scrapeProduct(url) {
    await this.initBrowser();

    try {
      logger.info(`Scraping Myntra product: ${url}`);

      await this.navigateToUrl(url);

      // Wait for page to load (fashion sites load images slowly)
      await this.page.waitForTimeout(4000);

      // Extract product data
      const productData = {
        productId: this.extractProductId(url),
        url,
        platform: 'myntra',
        timestamp: Date.now(),

        // Basic info
        title: await this.extractTitle(),
        price: await this.extractPrice(),
        currency: 'INR',
        availability: await this.checkAvailability(),

        // Metadata
        metadata: {
          originalPrice: await this.extractOriginalPrice(),
          discount: await this.extractDiscount(),
          sizes: await this.extractSizes(),
          colors: await this.extractColors(),
          images: await this.extractImages(),
          fashionSpecific: {
            brand: await this.extractBrand(),
            category: await this.extractCategory()
          }
        }
      };

      // Validate extracted data
      if (!productData.price) {
        throw new Error('Failed to extract price from page');
      }

      logger.info(`Successfully scraped product: ${productData.title} - ${productData.price}`);
      return productData;

    } catch (error) {
      logger.error(`Error scraping Myntra product: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Extract product ID from URL
   */
  extractProductId(url) {
    const match = url.match(/\/([^/]+)\/p\/(\d+)/i);
    return match ? match[2] : null;
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
      // Check if any size is available
      const sizeButtons = await this.page.$$(this.config.selectors.sizes[0]);
      return sizeButtons.length > 0;
    } catch (error) {
      return true;
    }
  }

  /**
   * Extract original price (before discount)
   */
  async extractOriginalPrice() {
    try {
      const originalPriceText = await this.extractText([
        '.pdp-mrp',
        '.original-price'
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
   * Extract available sizes
   */
  async extractSizes() {
    try {
      const sizes = await this.page.evaluate((selectors) => {
        const sizeButtons = document.querySelectorAll(selectors.sizes[0]);
        return Array.from(sizeButtons)
          .filter(btn => !btn.classList.contains('size-unavailable'))
          .map(btn => btn.textContent.trim());
      }, this.config.selectors);

      return sizes.length > 0 ? sizes : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract available colors
   */
  async extractColors() {
    try {
      const colors = await this.page.evaluate(() => {
        const colorSwatches = document.querySelectorAll('.color-shade');
        return Array.from(colorSwatches).map(swatch => ({
          name: swatch.getAttribute('data-color') || swatch.textContent.trim(),
          available: !swatch.classList.contains('unavailable')
        }));
      });

      return colors.length > 0 ? colors : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract product images
   */
  async extractImages() {
    try {
      const images = await this.page.evaluate((selectors) => {
        const imgElements = document.querySelectorAll(selectors.images[0]);
        return Array.from(imgElements)
          .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
          .filter(src => src);
      }, this.config.selectors);

      return images.length > 0 ? images : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract brand name
   */
  async extractBrand() {
    try {
      const brand = await this.extractText(['.pdp-brand', '.brand-name']);
      return brand;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract product category
   */
  async extractCategory() {
    try {
      const category = await this.extractText(['.pdp-category', '.product-category']);
      return category;
    } catch (error) {
      return null;
    }
  }

  /**
   * Scrape sale products
   * @returns {Array} - List of sale products
   */
  async scrapeSale(category = 'all') {
    await this.initBrowser();

    try {
      logger.info(`Scraping Myntra sale for category: ${category}`);

      const saleUrl = category === 'all'
        ? 'https://www.myntra.com/sale'
        : `https://www.myntra.com/${category}`;

      await this.navigateToUrl(saleUrl);
      await this.page.waitForTimeout(4000);

      // Extract product cards
      const products = await this.page.evaluate(() => {
        const cards = document.querySelectorAll('.product-base');
        return Array.from(cards).map(card => {
          const link = card.querySelector('a');
          const title = card.querySelector('.product-brand');
          const price = card.querySelector('.product-discountedPrice');
          const originalPrice = card.querySelector('.product-strike');
          const discount = card.querySelector('.product-discountPercentage');
          const image = card.querySelector('img');

          return {
            url: link ? link.href : null,
            title: title ? title.textContent.trim() : null,
            price: price ? price.textContent.trim() : null,
            originalPrice: originalPrice ? originalPrice.textContent.trim() : null,
            discount: discount ? discount.textContent.trim() : null,
            image: image ? image.getAttribute('src') : null
          };
        });
      });

      const validProducts = products.filter(p => p.url && p.price);
      logger.info(`Found ${validProducts.length} sale products`);

      return validProducts;

    } catch (error) {
      logger.error(`Error scraping sale: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }
}

module.exports = MyntraScraper;
