/**
 * Redis Stream Publisher
 *
 * Publishes price check requests and data to Redis Streams
 * Implements event-driven architecture for price tracking
 */

const redisConfig = require('../config/redis');
const { createClient } = require('redis');
const { Logger } = require('../../../shared/monitoring/logger');
const { v4: uuidv4 } = require('uuid');

const logger = new Logger('RedisPublisher');

class RedisPublisher {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.isConnected) {
      logger.warn('Redis already connected');
      return;
    }

    try {
      this.client = createClient(redisConfig.connection);

      this.client.on('error', (error) => {
        logger.error(`Redis error: ${error.message}`);
      });

      this.client.on('connect', () => {
        logger.info('Redis publisher connected');
        this.isConnected = true;
      });

      await this.client.connect();

      // Create streams if they don't exist
      await this.createStreams();

    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Redis Streams
   */
  async createStreams() {
    const streams = redisConfig.streams;

    for (const [streamName, config] of Object.entries(streams)) {
      try {
        // Try to create stream with max length
        await this.client.sendCommand([
          'XADD',
          streamName,
          'MAXLEN',
          '~',
          config.maxLength.toString(),
          '*',
          'init',
          'true'
        ]);
        logger.info(`Created stream: ${streamName}`);
      } catch (error) {
        // Stream might already exist, ignore error
        logger.debug(`Stream ${streamName} might already exist`);
      }
    }
  }

  /**
   * Publish price check request
   * @param {Object} priceCheck - Price check data
   */
  async publishPriceCheck(priceCheck) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const messageId = await this.client.xAdd(
        'price-checks',
        '*',
        {
          url: priceCheck.url,
          productId: priceCheck.productId || uuidv4(),
          platform: priceCheck.platform,
          userId: priceCheck.userId || 'default',
          priority: priceCheck.priority?.toString() || '5',
          checkInterval: priceCheck.checkInterval?.toString() || '3600000',
          targetPrice: priceCheck.thresholds?.targetPrice?.toString() || '',
          percentageDrop: priceCheck.thresholds?.percentageDrop?.toString() || '',
          allTimeLow: priceCheck.thresholds?.allTimeLow?.toString() || 'false',
          timestamp: Date.now().toString()
        }
      );

      logger.info(`Published price check: ${messageId} for ${priceCheck.url}`);
      return messageId;

    } catch (error) {
      logger.error(`Failed to publish price check: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish price data
   * @param {Object} priceData - Scraped price data
   */
  async publishPriceData(priceData) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const messageId = await this.client.xAdd(
        'price-data',
        '*',
        {
          productId: priceData.productId,
          url: priceData.url,
          platform: priceData.platform,
          timestamp: priceData.timestamp.toString(),
          price: priceData.price.toString(),
          currency: priceData.currency,
          availability: priceData.availability.toString(),
          title: priceData.title || '',
          rating: priceData.metadata?.rating?.toString() || '',
          reviewCount: priceData.metadata?.reviewCount?.toString() || '',
          lightningDeal: priceData.metadata?.lightningDeal?.toString() || 'false',
          prime: priceData.metadata?.prime?.toString() || 'false',
          discount: priceData.metadata?.discount?.toString() || '',
          originalPrice: priceData.metadata?.originalPrice?.toString() || ''
        }
      );

      logger.info(`Published price data: ${messageId} for ${priceData.productId}`);
      return messageId;

    } catch (error) {
      logger.error(`Failed to publish price data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish price alert
   * @param {Object} alert - Alert data
   */
  async publishAlert(alert) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const messageId = await this.client.xAdd(
        'price-alerts',
        '*',
        {
          alertId: alert.alertId || uuidv4(),
          productId: alert.productId,
          userId: alert.userId || 'default',
          type: alert.type,
          severity: alert.severity,
          timestamp: alert.timestamp?.toString() || Date.now().toString(),
          currentPrice: alert.data.currentPrice.toString(),
          previousPrice: alert.data.previousPrice?.toString() || '',
          percentageDrop: alert.data.percentageDrop?.toString() || '',
          targetPrice: alert.data.targetPrice?.toString() || '',
          allTimeLow: alert.data.allTimeLow?.toString() || 'false',
          url: alert.data.url,
          title: alert.data.title || '',
          channels: alert.channels?.join(',') || 'alexa'
        }
      );

      logger.info(`Published alert: ${messageId} for ${alert.productId}`);
      return messageId;

    } catch (error) {
      logger.error(`Failed to publish alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish historical price data
   * @param {Object} history - Historical data
   */
  async publishHistory(history) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const messageId = await this.client.xAdd(
        'price-history',
        '*',
        {
          productId: history.productId,
          platform: history.platform,
          timestamp: history.timestamp.toString(),
          price: history.price.toString(),
          availability: history.availability.toString(),
          metadata: JSON.stringify(history.metadata || {})
        }
      );

      logger.debug(`Published history: ${messageId} for ${history.productId}`);
      return messageId;

    } catch (error) {
      logger.error(`Failed to publish history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis publisher disconnected');
    }
  }
}

// Singleton instance
let publisherInstance = null;

/**
 * Get Redis publisher instance
 * @returns {RedisPublisher}
 */
function getPublisher() {
  if (!publisherInstance) {
    publisherInstance = new RedisPublisher();
  }
  return publisherInstance;
}

module.exports = {
  RedisPublisher,
  getPublisher
};
