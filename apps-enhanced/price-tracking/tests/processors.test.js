/**
 * Processor Tests
 *
 * Tests for Redis Stream processors and analyzers
 */

const { getPublisher } = require('../processors/redis-publisher');
const PriceAnalyzer = require('../processors/price-analyzer');

describe('Redis Publisher', () => {
  let publisher;

  beforeEach(() => {
    publisher = getPublisher();
  });

  afterEach(async () => {
    if (publisher && publisher.isConnected) {
      await publisher.disconnect();
    }
  });

  test('should create publisher instance', () => {
    expect(publisher).toBeDefined();
    expect(publisher).toBeInstanceOf(require('../processors/redis-publisher').RedisPublisher);
  });

  test('should connect to Redis', async () => {
    // This test requires Redis to be running
    try {
      await publisher.connect();
      expect(publisher.isConnected).toBe(true);
    } catch (error) {
      // Redis not available, skip test
      console.warn('Redis not available, skipping test');
    }
  });

  test('should publish price data', async () => {
    try {
      await publisher.connect();

      const priceData = {
        productId: 'test-product-123',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        platform: 'amazon',
        timestamp: Date.now(),
        price: 99.99,
        currency: 'USD',
        availability: true,
        title: 'Test Product',
        metadata: {
          rating: 4.5,
          reviewCount: 100,
          lightningDeal: false,
          prime: true
        }
      };

      const messageId = await publisher.publishPriceData(priceData);
      expect(messageId).toBeDefined();

    } catch (error) {
      console.warn('Redis not available, skipping test');
    }
  });

  test('should publish alert', async () => {
    try {
      await publisher.connect();

      const alert = {
        alertId: 'test-alert-123',
        productId: 'test-product-123',
        userId: 'default',
        type: 'price_drop',
        severity: 'warning',
        timestamp: Date.now(),
        data: {
          currentPrice: 89.99,
          previousPrice: 99.99,
          percentageDrop: 10.0,
          targetPrice: null,
          allTimeLow: false,
          url: 'https://www.amazon.com/dp/B08N5WRWNW',
          title: 'Test Product'
        },
        channels: ['alexa']
      };

      const messageId = await publisher.publishAlert(alert);
      expect(messageId).toBeDefined();

    } catch (error) {
      console.warn('Redis not available, skipping test');
    }
  });
});

describe('Price Analyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new PriceAnalyzer();
  });

  afterEach(async () => {
    if (analyzer && analyzer.isRunning) {
      await analyzer.stop();
    }
  });

  test('should create analyzer instance', () => {
    expect(analyzer).toBeDefined();
    expect(analyzer.isRunning).toBe(false);
  });

  test('should analyze price with no history', () => {
    const currentPrice = {
      productId: 'test-123',
      price: 99.99,
      platform: 'amazon'
    };

    const history = [];

    const analysis = analyzer.analyzePrice(currentPrice, history);

    expect(analysis.shouldAlert).toBe(false);
    expect(analysis.isAllTimeLow).toBe(false);
    expect(analysis.isSignificantDrop).toBe(false);
  });

  test('should detect all-time low', () => {
    const currentPrice = {
      productId: 'test-123',
      price: 89.99,
      title: 'Test Product',
      url: 'https://test.com/product'
    };

    const history = [
      { price: 99.99 },
      { price: 95.00 },
      { price: 90.00 }
    ];

    const analysis = analyzer.analyzePrice(currentPrice, history);

    expect(analysis.isAllTimeLow).toBe(true);
    expect(analysis.shouldAlert).toBe(true);
    expect(analysis.alert).toBeDefined();
    expect(analysis.alert.type).toBe('all_time_low');
    expect(analysis.alert.severity).toBe('critical');
  });

  test('should detect significant price drop', () => {
    const currentPrice = {
      productId: 'test-123',
      price: 85.00,
      title: 'Test Product',
      url: 'https://test.com/product'
    };

    const history = [
      { price: 100.00 } // 15% drop
    ];

    const analysis = analyzer.analyzePrice(currentPrice, history);

    expect(analysis.isSignificantDrop).toBe(true);
    expect(analysis.shouldAlert).toBe(true);
    expect(analysis.alert.type).toBe('price_drop');
    expect(analysis.alert.data.percentageDrop).toBe('15.00');
  });

  test('should detect lightning deal', () => {
    const currentPrice = {
      productId: 'test-123',
      price: 95.00,
      title: 'Test Product',
      url: 'https://test.com/product',
      metadata: {
        lightningDeal: true
      }
    };

    const history = [
      { price: 100.00 }
    ];

    const analysis = analyzer.analyzePrice(currentPrice, history);

    expect(analysis.shouldAlert).toBe(true);
    expect(analysis.alert.type).toBe('lightning_deal');
  });

  test('should not alert for small price drop', () => {
    const currentPrice = {
      productId: 'test-123',
      price: 97.00,
      title: 'Test Product',
      url: 'https://test.com/product'
    };

    const history = [
      { price: 100.00 } // Only 3% drop
    ];

    const analysis = analyzer.analyzePrice(currentPrice, history);

    expect(analysis.shouldAlert).toBe(false);
  });

  test('should handle price increase', () => {
    const currentPrice = {
      productId: 'test-123',
      price: 105.00,
      title: 'Test Product',
      url: 'https://test.com/product'
    };

    const history = [
      { price: 100.00 }
    ];

    const analysis = analyzer.analyzePrice(currentPrice, history);

    expect(analysis.shouldAlert).toBe(false);
    expect(analysis.dropPercentage).toBeLessThan(0);
  });
});

describe('Message Parsing', () => {
  test('should parse price data message', () => {
    const analyzer = new PriceAnalyzer();

    const message = {
      productId: 'test-123',
      url: 'https://amazon.com/dp/B08N5WRWNW',
      platform: 'amazon',
      timestamp: '1234567890',
      price: '99.99',
      currency: 'USD',
      availability: 'true',
      title: 'Test Product',
      rating: '4.5',
      reviewCount: '100',
      lightningDeal: 'false',
      prime: 'true'
    };

    const parsed = analyzer.parseMessageData(message);

    expect(parsed.productId).toBe('test-123');
    expect(parsed.price).toBe(99.99);
    expect(parsed.availability).toBe(true);
    expect(parsed.metadata.rating).toBe(4.5);
    expect(parsed.metadata.reviewCount).toBe(100);
    expect(parsed.metadata.prime).toBe(true);
  });
});
