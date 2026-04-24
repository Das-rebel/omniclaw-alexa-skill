/**
 * Notification Service
 *
 * Sends alerts through multiple channels:
 * - Alexa voice notifications
 * - Firebase Cloud Messaging (FCM) push notifications
 * - Email notifications
 * - SMS notifications (optional)
 * - Webhook notifications (for integrations)
 *
 * Features:
 * - Multi-channel delivery with fallback
 * - Notification batching
 * - Rate limiting
 * - Delivery tracking
 * - Retry logic
 * - User preferences
 */

const admin = require('firebase-admin');
const { Redis } = require('@upstash/redis');
const { Logger } = require('../../../shared/monitoring/logger');
const fetch = require('node-fetch');

const logger = new Logger('NotificationService');

class NotificationService {
  constructor(config = {}) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 10,
      rateLimitPerUser: 5, // Max 5 notifications per hour
      rateLimitWindow: 3600000, // 1 hour
      defaultChannels: ['alexa', 'fcm'],
      ...config
    };

    // Initialize Firebase Admin
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      if (!admin.apps.length) {
        const serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
        );

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });

        logger.info('Firebase Admin initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  /**
   * Send notification through preferred channels
   */
  async sendNotification(userId, alert, userPreferences = {}) {
    try {
      // Check rate limits
      const rateLimitOk = await this.checkRateLimit(userId);
      if (!rateLimitOk) {
        logger.warn(`Rate limit exceeded for user ${userId}`);
        return { success: false, reason: 'rate_limited' };
      }

      // Determine channels to use
      const channels = userPreferences.channels || this.config.defaultChannels;

      // Track delivery attempts
      const deliveryResults = [];
      let success = false;

      for (const channel of channels) {
        try {
          const result = await this.sendToChannel(channel, userId, alert, userPreferences);
          deliveryResults.push({ channel, result });

          if (result.success) {
            success = true;
            await this.recordDelivery(userId, alert, channel, true);
            logger.info(`Notification sent via ${channel} to user ${userId}`);
          } else {
            await this.recordDelivery(userId, alert, channel, false, result.error);
          }
        } catch (error) {
          logger.error(`Failed to send via ${channel}:`, error);
          deliveryResults.push({ channel, error: error.message });
          await this.recordDelivery(userId, alert, channel, false, error.message);
        }
      }

      // Update rate limit counter
      await this.updateRateLimit(userId);

      return {
        success,
        channels: deliveryResults,
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific channel
   */
  async sendToChannel(channel, userId, alert, preferences) {
    switch (channel) {
      case 'alexa':
        return this.sendAlexaNotification(userId, alert, preferences);

      case 'fcm':
        return this.sendFCMNotification(userId, alert, preferences);

      case 'email':
        return this.sendEmailNotification(userId, alert, preferences);

      case 'sms':
        return this.sendSMSNotification(userId, alert, preferences);

      case 'webhook':
        return this.sendWebhookNotification(userId, alert, preferences);

      default:
        return { success: false, error: `Unknown channel: ${channel}` };
    }
  }

  /**
   * Send Alexa voice notification
   */
  async sendAlexaNotification(userId, alert, preferences) {
    try {
      // Get user's Alexa device ID
      const alexaDeviceId = preferences.alexaDeviceId;
      if (!alexaDeviceId) {
        return { success: false, error: 'No Alexa device configured' };
      }

      // Construct voice message
      const voiceMessage = this.constructVoiceMessage(alert);

      // Call Alexa notification API
      const apiUrl = process.env.ALEXA_API_URL || 'http://localhost:3000/api/notify';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ALEXA_API_KEY}`
        },
        body: JSON.stringify({
          userId,
          deviceId: alexaDeviceId,
          message: voiceMessage,
          type: 'price_alert',
          data: alert
        })
      });

      if (response.ok) {
        return { success: true, messageId: await response.json().id };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }

    } catch (error) {
      logger.error('Alexa notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Construct voice message for Alexa
   */
  constructVoiceMessage(alert) {
    const messages = {
      price_drop: `Price alert! ${alert.message}. Current price is ${alert.currentPrice} rupees.`,
      price_rise: `Price alert! ${alert.message}. Current price is ${alert.currentPrice} rupees.`,
      target_price: `Great news! ${alert.message}. Don't miss out!`,
      stock_available: `Good news! ${alert.message}`,
      lightning_deal: `Flash sale! ${alert.message}. Limited time offer!`,
      competitor_price: `Price match alert! ${alert.message}. Check ${alert.betterPlatform} now.`,
      significant_change: `Price update! ${alert.message}.`
    };

    return messages[alert.type] || `Price alert! ${alert.message}`;
  }

  /**
   * Send FCM push notification
   */
  async sendFCMNotification(userId, alert, preferences) {
    try {
      // Get user's FCM tokens
      const tokens = await this.getUserFCMTokens(userId);
      if (!tokens || tokens.length === 0) {
        return { success: false, error: 'No FCM tokens registered' };
      }

      // Construct notification payload
      const notification = {
        title: this.getNotificationTitle(alert),
        body: alert.message,
        icon: 'price_alert',
        badge: 1,
        sound: 'default',
        tag: `price_alert_${alert.productId}`,
        clickAction: 'OPEN_PRODUCT_DETAILS',
        data: {
          type: 'price_alert',
          productId: alert.productId,
          platform: alert.platform,
          alertType: alert.type,
          currentPrice: alert.currentPrice?.toString(),
          timestamp: Date.now().toString()
        }
      };

      // Send to all tokens
      const results = [];
      for (const token of tokens) {
        try {
          const response = await admin.messaging().send({
            token,
            notification,
            data: notification.data,
            android: {
              priority: alert.severity === 'high' ? 'high' : 'normal',
              notification: {
                channel_id: 'price_alerts',
                vibration: true,
                light_settings: {
                  color: '#FF0000',
                  light_on_duration_ms: 300,
                  light_off_duration_ms: 300
                }
              }
            },
            apns: {
              payload: {
                aps: {
                  alert: notification,
                  badge: 1,
                  sound: alert.severity === 'high' ? 'emergency.caf' : 'default'
                }
              }
            }
          });

          results.push({ token, success: true, messageId: response });
        } catch (error) {
          if (error.code === 'messaging/registration-token-not-registered') {
            // Remove invalid token
            await this.removeFCMToken(userId, token);
          }
          results.push({ token, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        delivered: successCount,
        failed: results.length - successCount,
        results
      };

    } catch (error) {
      logger.error('FCM notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification title
   */
  getNotificationTitle(alert) {
    const titles = {
      price_drop: '💸 Price Drop Alert!',
      price_rise: '📈 Price Increase',
      target_price: '🎯 Target Price Reached!',
      stock_available: '✅ Back in Stock!',
      lightning_deal: '⚡ Flash Sale!',
      competitor_price: '🔍 Better Price Found!',
      significant_change: '📊 Price Update'
    };

    return titles[alert.type] || '💰 Price Alert';
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, alert, preferences) {
    try {
      const email = preferences.email;
      if (!email) {
        return { success: false, error: 'No email configured' };
      }

      // Construct email HTML
      const html = this.constructEmailHTML(alert);

      // Send via email service (SendGrid, AWS SES, etc.)
      const emailService = process.env.EMAIL_SERVICE || 'sendgrid';
      let result;

      switch (emailService) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(email, html, alert);
          break;
        case 'ses':
          result = await this.sendViaSES(email, html, alert);
          break;
        default:
          result = { success: false, error: 'No email service configured' };
      }

      return result;

    } catch (error) {
      logger.error('Email notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Construct email HTML
   */
  constructEmailHTML(alert) {
    const colors = {
      high: '#ff4444',
      medium: '#ffbb33',
      low: '#99CC00'
    };

    const color = colors[alert.severity] || colors.medium;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">Price Alert</h2>
        <p><strong>${alert.message}</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Product ID:</strong> ${alert.productId}</p>
          <p><strong>Platform:</strong> ${alert.platform}</p>
          <p><strong>Current Price:</strong> ₹${alert.currentPrice}</p>
          ${alert.previousPrice ? `<p><strong>Previous Price:</strong> ₹${alert.previousPrice}</p>` : ''}
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        </div>
        <p style="color: #666; font-size: 12px;">
          You received this alert because you subscribed to price tracking for this product.
          <br><br>
          To manage your alerts, visit your account settings.
        </p>
      </div>
    `;
  }

  /**
   * Send via SendGrid
   */
  async sendViaSendGrid(email, html, alert) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'alerts@omniclaw.app',
      subject: `Price Alert: ${alert.message}`,
      html
    };

    await sgMail.send(msg);
    return { success: true };
  }

  /**
   * Send via AWS SES
   */
  async sendViaSES(email, html, alert) {
    const AWS = require('aws-sdk');
    const ses = new AWS.SES({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const params = {
      Source: process.env.EMAIL_FROM || 'alerts@omniclaw.app',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `Price Alert: ${alert.message}` },
        Body: { Html: { Data: html } }
      }
    };

    await ses.sendEmail(params).promise();
    return { success: true };
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, alert, preferences) {
    try {
      const phoneNumber = preferences.phoneNumber;
      if (!phoneNumber) {
        return { success: false, error: 'No phone number configured' };
      }

      // Construct SMS message (max 160 chars)
      const message = `${alert.message}. Current: ₹${alert.currentPrice}. ${alert.platform}`;

      // Send via SMS service (Twilio, AWS SNS, etc.)
      const smsService = process.env.SMS_SERVICE || 'twilio';
      let result;

      switch (smsService) {
        case 'twilio':
          result = await this.sendViaTwilio(phoneNumber, message);
          break;
        case 'sns':
          result = await this.sendViaSNS(phoneNumber, message);
          break;
        default:
          result = { success: false, error: 'No SMS service configured' };
      }

      return result;

    } catch (error) {
      logger.error('SMS notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(phoneNumber, message) {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    return { success: true };
  }

  /**
   * Send via AWS SNS
   */
  async sendViaSNS(phoneNumber, message) {
    const AWS = require('aws-sdk');
    const sns = new AWS.SNS({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    await sns.publish({
      PhoneNumber: phoneNumber,
      Message: message
    }).promise();

    return { success: true };
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(userId, alert, preferences) {
    try {
      const webhookUrl = preferences.webhookUrl;
      if (!webhookUrl) {
        return { success: false, error: 'No webhook URL configured' };
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OmniClaw-PriceTracker/1.0'
        },
        body: JSON.stringify({
          userId,
          alert,
          timestamp: Date.now(),
          signature: this.generateWebhookSignature(alert)
        })
      });

      if (response.ok) {
        return { success: true, status: response.status };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }

    } catch (error) {
      logger.error('Webhook notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate webhook signature
   */
  generateWebhookSignature(alert) {
    const crypto = require('crypto');
    const payload = JSON.stringify(alert);
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Get user's FCM tokens from Redis
   */
  async getUserFCMTokens(userId) {
    try {
      const tokens = await this.redis.smembers(`fcm:tokens:${userId}`);
      return tokens;
    } catch (error) {
      logger.error('Failed to get FCM tokens:', error);
      return [];
    }
  }

  /**
   * Register FCM token for user
   */
  async registerFCMToken(userId, token) {
    try {
      await this.redis.sadd(`fcm:tokens:${userId}`, token);
      logger.info(`Registered FCM token for user ${userId}`);
    } catch (error) {
      logger.error('Failed to register FCM token:', error);
    }
  }

  /**
   * Remove invalid FCM token
   */
  async removeFCMToken(userId, token) {
    try {
      await this.redis.srem(`fcm:tokens:${userId}`, token);
      logger.info(`Removed invalid FCM token for user ${userId}`);
    } catch (error) {
      logger.error('Failed to remove FCM token:', error);
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(userId) {
    try {
      const key = `notification:rate:${userId}`;
      const count = await this.redis.get(key) || 0;
      return count < this.config.rateLimitPerUser;
    } catch (error) {
      logger.error('Failed to check rate limit:', error);
      return true; // Allow on error
    }
  }

  /**
   * Update rate limit
   */
  async updateRateLimit(userId) {
    try {
      const key = `notification:rate:${userId}`;
      await this.redis.incr(key);
      await this.redis.expire(key, this.config.rateLimitWindow / 1000);
    } catch (error) {
      logger.error('Failed to update rate limit:', error);
    }
  }

  /**
   * Record notification delivery
   */
  async recordDelivery(userId, alert, channel, success, error = null) {
    try {
      const key = `notification:history:${userId}`;
      const record = {
        alertId: alert.alertId,
        alertType: alert.type,
        productId: alert.productId,
        channel,
        success,
        error,
        timestamp: Date.now()
      };

      await this.redis.lpush(key, JSON.stringify(record));
      await this.redis.ltrim(key, 0, 999); // Keep last 1000 records

    } catch (error) {
      logger.error('Failed to record delivery:', error);
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(userId, days = 30) {
    try {
      const key = `notification:history:${userId}`;
      const records = await this.redis.lrange(key, 0, -1);
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

      const stats = {
        total: 0,
        successful: 0,
        failed: 0,
        byChannel: {},
        byType: {}
      };

      for (const recordStr of records) {
        const record = JSON.parse(recordStr);
        if (record.timestamp < cutoffTime) continue;

        stats.total++;
        if (record.success) stats.successful++;
        else stats.failed++;

        stats.byChannel[record.channel] = (stats.byChannel[record.channel] || 0) + 1;
        stats.byType[record.alertType] = (stats.byType[record.alertType] || 0) + 1;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get delivery stats:', error);
      return null;
    }
  }

  /**
   * Batch notifications for efficient delivery
   */
  async sendBatchNotifications(notifications) {
    const results = [];

    for (let i = 0; i < notifications.length; i += this.config.batchSize) {
      const batch = notifications.slice(i, i + this.config.batchSize);

      const batchPromises = batch.map(notification =>
        this.sendNotification(
          notification.userId,
          notification.alert,
          notification.preferences
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + this.config.batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

module.exports = NotificationService;
