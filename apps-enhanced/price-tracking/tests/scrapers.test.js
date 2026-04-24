/**
 * Scraper Tests
 *
 * Comprehensive tests for all platform scrapers
 */

const AmazonScraper = require('../scrapers/amazon-scraper');
const FlipkartScraper = require('../scrapers/flipkart-scraper');
const MyntraScraper = require('../scrapers/myntra-scraper');
const { getScraperForUrl } = require('../scrapers/scraper-factory');

describe('Platform Scrapers', () => {
  describe('getScraperForUrl', () => {
    test('should return Amazon scraper for Amazon URL', () => {
      const url = 'https://www.amazon.com/dp/B08N5WRWNW';
      const scraper = getScraperForUrl(url);
      expect(scraper).toBeInstanceOf(AmazonScraper);
    });

    test('should return Flipkart scraper for Flipkart URL', () => {
      const url = 'https://www.flipkart.com/apple-iphone-14-blue-128-gb/p/itmb7ccf6fdf8d7b';
      const scraper = getScraperForUrl(url);
      expect(scraper).toBeInstanceOf(FlipkartScraper);
    });

    test('should return Myntra scraper for Myntra URL', () => {
      const url = 'https://www.myntra.com/shoes/nike-air-max-270/s-12345';
      const scraper = getScraperForUrl(url);
      expect(scraper).toBeInstanceOf(MyntraScraper);
    });

    test('should throw error for unsupported URL', () => {
      const url = 'https://www.example.com/product';
      expect(() => getScraperForUrl(url)).toThrow('Unsupported platform');
    });
  });

  describe('AmazonScraper', () => {
    let scraper;

    beforeEach(() => {
      scraper = new AmazonScraper();
    });

    afterEach(async () => {
      if (scraper) {
        await scraper.close();
      }
    });

    test('should extract product ID from URL', () => {
      const url = 'https://www.amazon.com/dp/B08N5WRWNW';
      const productId = scraper.extractProductId(url);
      expect(productId).toBe('B08N5WRWNW');
    });

    test('should parse price string correctly', () => {
      expect(scraper.parsePrice('$99.99')).toBe(99.99);
      expect(scraper.parsePrice('₹1,999')).toBe(1999);
      expect(scraper.parsePrice('€50.00')).toBe(50.00);
      expect(scraper.parsePrice('invalid')).toBeNull();
    });

    test('should parse rating correctly', () => {
      expect(scraper.parseRating('4.5 out of 5')).toBe(4.5);
      expect(scraper.parseRating('3.7')).toBe(3.7);
      expect(scraper.parseRating('invalid')).toBeNull();
    });
  });

  describe('FlipkartScraper', () => {
    let scraper;

    beforeEach(() => {
      scraper = new FlipkartScraper();
    });

    afterEach(async () => {
      if (scraper) {
        await scraper.close();
      }
    });

    test('should extract product ID from URL', () => {
      const url = 'https://www.flipkart.com/apple-iphone-14-blue-128-gb/p/itmb7ccf6fdf8d7b';
      const productId = scraper.extractProductId(url);
      expect(productId).toBe('itmb7ccf6fdf8d7b');
    });

    test('should parse price string correctly', () => {
      expect(scraper.parsePrice('₹49,999')).toBe(49999);
      expect(scraper.parsePrice('₹1,999')).toBe(1999);
      expect(scraper.parsePrice('invalid')).toBeNull();
    });
  });

  describe('MyntraScraper', () => {
    let scraper;

    beforeEach(() => {
      scraper = new MyntraScraper();
    });

    afterEach(async () => {
      if (scraper) {
        await scraper.close();
      }
    });

    test('should extract product ID from URL', () => {
      const url = 'https://www.myntra.com/shoes/nike-air-max-270/p/12345';
      const productId = scraper.extractProductId(url);
      expect(productId).toBe('12345');
    });
  });
});

describe('Scraper Integration Tests', () => {
  // These tests require actual network requests
  // They should be run separately with: npm run test:integration

  describe.skip('Amazon - Live Scrape', () => {
    test('should scrape real Amazon product', async () => {
      const scraper = new AmazonScraper();

      try {
        // Use a real product URL
        const url = 'https://www.amazon.com/dp/B08N5WRWNW';
        const data = await scraper.scrapeProduct(url);

        expect(data).toHaveProperty('productId');
        expect(data).toHaveProperty('title');
        expect(data).toHaveProperty('price');
        expect(data).toHaveProperty('platform', 'amazon');
        expect(data).toHaveProperty('timestamp');

        expect(data.price).toBeGreaterThan(0);
      } finally {
        await scraper.close();
      }
    }, 60000);
  });

  describe.skip('Flipkart - Live Scrape', () => {
    test('should scrape real Flipkart product', async () => {
      const scraper = new FlipkartScraper();

      try {
        const url = 'https://www.flipkart.com/apple-iphone-14-blue-128-gb/p/itmb7ccf6fdf8d7b';
        const data = await scraper.scrapeProduct(url);

        expect(data).toHaveProperty('productId');
        expect(data).toHaveProperty('title');
        expect(data).toHaveProperty('price');
        expect(data).toHaveProperty('platform', 'flipkart');

        expect(data.price).toBeGreaterThan(0);
      } finally {
        await scraper.close();
      }
    }, 60000);
  });

  describe.skip('Myntra - Live Scrape', () => {
    test('should scrape real Myntra product', async () => {
      const scraper = new MyntraScraper();

      try {
        const url = 'https://www.myntra.com/shoes/nike-air-max-270/p/12345';
        const data = await scraper.scrapeProduct(url);

        expect(data).toHaveProperty('productId');
        expect(data).toHaveProperty('title');
        expect(data).toHaveProperty('price');
        expect(data).toHaveProperty('platform', 'myntra');

        expect(data.price).toBeGreaterThan(0);
      } finally {
        await scraper.close();
      }
    }, 60000);
  });
});
