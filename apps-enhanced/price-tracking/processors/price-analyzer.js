/**
 * Price Analyzer Service
 *
 * Consumes price data from Redis Streams and analyzes trends
 * Detects all-time lows, price drops, and deals
 */

const redisConfig = require('../config/redis');
const { createClient } = require('redis');
const { Logger } = require('../../../shared/monitoring/logger');
const { getPublisher } = require('./redis-publisher');

const logger = new Logger('PriceAnalyzer');

class PriceAnalyzer {
  constructor() {
    this.client = null;
    this.consumer = null;
    this.isRunning = false;
    this.priceHistory = new Map(); // In-memory cache of recent prices
  }

  /**
   * Connect to Redis and setup consumer
   */
  async connect() {
    try {
      this.client = createClient(redisConfig.connection);

      this.client.on('error', (error) => {
        logger.error(`Redis error: ${error.message}`);
      });

      await this.client.connect();

      // Create consumer group if it doesn't exist
      try {
        await this.client.xGroupCreate(
          'price-data',
          'analyzers',
          '0',
          { MKSTREAM: true }
        );
        logger.info('Created consumer group: analyzers');
      } catch (error) {
        // Group might already exist
        logger.debug('Consumer group might already exist');
      }

      logger.info('Price analyzer connected');
    } catch (error) {
      logger.error(`Failed to connect: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start consuming price data
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Analyzer already running');
      return;
    }

    await this.connect();
    this.isRunning = true;

    const config = redisConfig.consumers.analyzer;
    this.consumer = `analyzer-${Date.now()}`;

    logger.info(`Starting price analyzer consumer: ${this.consumer}`);

    while (this.isRunning) {
      try {
        // Read messages from stream
        const messages = await this.client.xReadGroup(
          'GROUP', 'analyzers', this.consumer,
          'STREAMS', 'price-data', '>',
          'COUNT', config.count,
          'BLOCK', config.blockTime
        );

        if (messages && messages.length > 0) {
          for (const [stream, streamMessages] of messages) {
            for (const message of streamMessages) {
              await this.processMessage(message);
              await this.acknowledgeMessage(message.id);
            }
          }
        }
      } catch (error) {
        logger.error(`Error consuming messages: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process price data message
   */
  async processMessage(message) {
    try {
      const data = this.parseMessageData(message.message);

      logger.debug(`Analyzing price data for: ${data.productId}`);

      // Get historical prices
      const history = await this.getHistoricalPrices(data.productId);

      // Analyze price
      const analysis = this.analyzePrice(data, history);

      // Publish alerts if conditions met
      if (analysis.shouldAlert) {
        const publisher = getPublisher();
        await publisher.publishAlert(analysis.alert);
      }

      // Publish to history
      await this.publishHistory(data);

      // Update cache
      this.updateCache(data);

    } catch (error) {
      logger.error(`Error processing message: ${error.message}`);
    }
  }

  /**
   * Parse message data
   */
  parseMessageData(message) {
    return {
      productId: message.productId,
      url: message.url,
      platform: message.platform,
      timestamp: parseInt(message.timestamp),
      price: parseFloat(message.price),
      currency: message.currency,
      availability: message.availability === 'true',
      title: message.title,
      metadata: {
        rating: message.rating ? parseFloat(message.rating) : null,
        reviewCount: message.reviewCount ? parseInt(message.reviewCount) : null,
        lightningDeal: message.lightningDeal === 'true',
        prime: message.prime === 'true',
        discount: message.discount ? parseFloat(message.discount) : null,
        originalPrice: message.originalPrice ? parseFloat(message.originalPrice) : null
      }
    };
  }

  /**
   * Get historical prices from Firestore or cache
   */
  async getHistoricalPrices(productId) {
    // Check cache first
    if (this.priceHistory.has(productId)) {
      return this.priceHistory.get(productId);
    }

    // TODO: Fetch from Firestore
    // For now, return empty array
    return [];
  }

  /**
   * Analyze price against historical data
   */
  analyzePrice(currentPrice, historicalPrices) {
    const analysis = {
      shouldAlert: false,
      alert: null,
      isAllTimeLow: false,
      isSignificantDrop: false,
      dropPercentage: 0
    };

    if (historicalPrices.length === 0) {
      return analysis;
    }

    // Sort by price
    const sortedPrices = historicalPrices.map(p => p.price).sort((a, b) => a - b);
    const allTimeLowPrice = sortedPrices[0];
    const previousPrice = historicalPrices[historicalPrices.length - 1]?.price || currentPrice.price;

    // Check if all-time low
    if (currentPrice.price <= allTimeLowPrice) {
      analysis.isAllTimeLow = true;
      analysis.shouldAlert = true;

      analysis.alert = {
        alertId: `atl-${Date.now()}`,
        productId: currentPrice.productId,
        userId: 'default',
        type: 'all_time_low',
        severity: 'critical',
        timestamp: Date.now(),
        data: {
          currentPrice: currentPrice.price,
          previousPrice: previousPrice,
          percentageDrop: ((previousPrice - currentPrice.price) / previousPrice * 100).toFixed(2),
          targetPrice: null,
          allTimeLow: true,
          url: currentPrice.url,
          title: currentPrice.title
        },
        channels: ['alexa', 'fcm', 'email']
      };

      return analysis;
    }

    // Check for significant drop (>10%)
    const dropPercentage = (previousPrice - currentPrice.price) / previousPrice * 100;
    analysis.dropPercentage = dropPercentage;

    if (dropPercentage >= 10) {
      analysis.isSignificantDrop = true;
      analysis.shouldAlert = true;

      analysis.alert = {
        alertId: `drop-${Date.now()}`,
        productId: currentPrice.productId,
        userId: 'default',
        type: 'price_drop',
        severity: dropPercentage >= 20 ? 'critical' : 'warning',
        timestamp: Date.now(),
        data: {
          currentPrice: currentPrice.price,
          previousPrice: previousPrice,
          percentageDrop: dropPercentage.toFixed(2),
          targetPrice: null,
          allTimeLow: false,
          url: currentPrice.url,
          title: currentPrice.title
        },
        channels: ['alexa', 'fcm']
      };
    }

    // Check for lightning deal
    if (currentPrice.metadata.lightningDeal) {
      analysis.shouldAlert = true;
      analysis.alert = {
        alertId: `deal-${Date.now()}`,
        productId: currentPrice.productId,
        userId: 'default',
        type: 'lightning_deal',
        severity: 'critical',
        timestamp: Date.now(),
        data: {
          currentPrice: currentPrice.price,
          previousPrice: previousPrice,
          percentageDrop: dropPercentage.toFixed(2),
          targetPrice: null,
          allTimeLow: false,
          url: currentPrice.url,
          title: currentPrice.title
        },
        channels: ['alexa', 'fcm']
      };
    }

    return analysis;
  }

  /**
   * Publish historical data
   */
  async publishHistory(data) {
    const publisher = getPublisher();
    await publisher.publishHistory({
      productId: data.productId,
      platform: data.platform,
      timestamp: data.timestamp,
      price: data.price,
      availability: data.availability,
      metadata: data.metadata
    });
  }

  /**
   * Update in-memory cache
   */
  updateCache(data) {
    if (!this.priceHistory.has(data.productId)) {
      this.priceHistory.set(data.productId, []);
    }

    const history = this.priceHistory.get(data.productId);
    history.push({
      timestamp: data.timestamp,
      price: data.price,
      availability: data.availability
    });

    // Keep only last 100 entries in memory
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Acknowledge message processing
   */
  async acknowledgeMessage(messageId) {
    try {
      await this.client.xAck('price-data', 'analyzers', messageId);
    } catch (error) {
      logger.error(`Failed to acknowledge message: ${error.message}`);
    }
  }

  /**
   * Stop consuming
   */
  async stop() {
    this.isRunning = false;
    if (this.client) {
      await this.client.quit();
    }
    logger.info('Price analyzer stopped');
  }
}

module.exports = PriceAnalyzer;
