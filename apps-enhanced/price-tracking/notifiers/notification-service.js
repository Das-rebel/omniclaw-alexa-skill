/**
 * Notification Service
 *
 * Consumes alerts from Redis Streams and sends notifications
 * Supports multiple channels: Alexa, FCM, Email
 */

const redisConfig = require('../config/redis');
const { createClient } = require('redis');
const { Logger } = require('../../../shared/monitoring/logger');
const AlexaNotifier = require('./alexa-notifier');

const logger = new Logger('NotificationService');

class NotificationService {
  constructor() {
    this.client = null;
    this.consumer = null;
    this.isRunning = false;
    this.notifiers = {
      alexa: null,
      fcm: null,
      email: null
    };
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
          'price-alerts',
          'notifiers',
          '0',
          { MKSTREAM: true }
        );
        logger.info('Created consumer group: notifiers');
      } catch (error) {
        logger.debug('Consumer group might already exist');
      }

      // Initialize notifiers
      this.notifiers.alexa = new AlexaNotifier();

      logger.info('Notification service connected');
    } catch (error) {
      logger.error(`Failed to connect: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start consuming alerts
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Notification service already running');
      return;
    }

    await this.connect();
    this.isRunning = true;

    const config = redisConfig.consumers.notifier;
    this.consumer = `notifier-${Date.now()}`;

    logger.info(`Starting notification service: ${this.consumer}`);

    while (this.isRunning) {
      try {
        // Read messages from stream
        const messages = await this.client.xReadGroup(
          'GROUP', 'notifiers', this.consumer,
          'STREAMS', 'price-alerts', '>',
          'COUNT', config.count,
          'BLOCK', config.blockTime
        );

        if (messages && messages.length > 0) {
          for (const [stream, streamMessages] of messages) {
            for (const message of streamMessages) {
              await this.processAlert(message);
              await this.acknowledgeAlert(message.id);
            }
          }
        }
      } catch (error) {
        logger.error(`Error consuming alerts: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process alert and send notifications
   */
  async processAlert(message) {
    try {
      const alert = this.parseAlertData(message.message);

      logger.info(`Processing alert: ${alert.alertId} for product: ${alert.productId}`);

      // Determine which channels to use
      const channels = alert.channels || ['alexa'];

      // Send to each channel
      const results = [];
      for (const channel of channels) {
        try {
          const result = await this.sendToChannel(channel, alert);
          results.push({ channel, success: true, result });
        } catch (error) {
          logger.error(`Failed to send to ${channel}: ${error.message}`);
          results.push({ channel, success: false, error: error.message });
        }
      }

      // Log results
      const successful = results.filter(r => r.success).length;
      logger.info(`Alert sent to ${successful}/${channels.length} channels`);

    } catch (error) {
      logger.error(`Error processing alert: ${error.message}`);
    }
  }

  /**
   * Parse alert data from message
   */
  parseAlertData(message) {
    return {
      alertId: message.alertId,
      productId: message.productId,
      userId: message.userId,
      type: message.type,
      severity: message.severity,
      timestamp: parseInt(message.timestamp),
      data: {
        currentPrice: parseFloat(message.currentPrice),
        previousPrice: message.previousPrice ? parseFloat(message.previousPrice) : null,
        percentageDrop: message.percentageDrop ? parseFloat(message.percentageDrop) : null,
        targetPrice: message.targetPrice ? parseFloat(message.targetPrice) : null,
        allTimeLow: message.allTimeLow === 'true',
        url: message.url,
        title: message.title
      },
      channels: message.channels ? message.channels.split(',') : ['alexa']
    };
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(channel, alert) {
    switch (channel) {
      case 'alexa':
        return await this.notifiers.alexa.sendPriceAlert(alert);

      case 'fcm':
        return await this.sendFCMNotification(alert);

      case 'email':
        return await this.sendEmailNotification(alert);

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send FCM push notification
   */
  async sendFCMNotification(alert) {
    // TODO: Implement FCM notification
    logger.info(`FCM notification for ${alert.data.title}`);
    return { status: 'sent', channel: 'fcm' };
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(alert) {
    // TODO: Implement email notification
    logger.info(`Email notification for ${alert.data.title}`);
    return { status: 'sent', channel: 'email' };
  }

  /**
   * Acknowledge alert processing
   */
  async acknowledgeAlert(messageId) {
    try {
      await this.client.xAck('price-alerts', 'notifiers', messageId);
    } catch (error) {
      logger.error(`Failed to acknowledge alert: ${error.message}`);
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
    logger.info('Notification service stopped');
  }
}

module.exports = NotificationService;
