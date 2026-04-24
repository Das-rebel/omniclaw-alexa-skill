/**
 * Alexa Proactive Event Notifier
 *
 * Sends price drop alerts to Alexa devices
 * Uses Alexa Proactive Events API
 */

const axios = require('axios');
const { Logger } = require('../../../shared/monitoring/logger');
const { createResilientFunction } = require('../../../shared/resilience');

const logger = new Logger('AlexaNotifier');

class AlexaNotifier {
  constructor(apiEndpoint, apiKey) {
    this.apiEndpoint = apiEndpoint || process.env.ALEXA_API_ENDPOINT;
    this.apiKey = apiKey || process.env.ALEXA_API_KEY;

    // Create resilient HTTP client
    this.sendEvent = createResilientFunction(
      this._sendEvent.bind(this),
      {
        name: 'alexa-proactive-event',
        timeout: 10000,
        maxRetries: 3,
        circuitBreaker: { threshold: 5, timeout: 60000 }
      }
    );
  }

  /**
   * Send price drop alert to Alexa
   * @param {Object} alert - Alert data
   */
  async sendPriceAlert(alert) {
    try {
      logger.info(`Sending Alexa alert for: ${alert.data.title}`);

      const event = {
        alertId: alert.alertId,
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
        data: {
          title: alert.data.title,
          currentPrice: alert.data.currentPrice,
          previousPrice: alert.data.previousPrice,
          percentageDrop: alert.data.percentageDrop,
          url: alert.data.url,
          allTimeLow: alert.data.allTimeLow
        }
      };

      const response = await this.sendEvent(event);

      logger.info(`Alexa alert sent successfully: ${response.data.alertId}`);
      return response.data;

    } catch (error) {
      logger.error(`Failed to send Alexa alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal method to send event to Alexa API
   */
  async _sendEvent(event) {
    const payload = {
      timestamp: new Date(event.timestamp).toISOString(),
      referenceId: event.alertId,
      expiryTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      event: {
        name: 'AMAZON.PriceAlert.Alert',
        payload: {
          alert: {
            type: event.type,
            severity: event.severity,
            product: {
              name: this.truncateText(event.data.title, 50),
              currentPrice: {
                value: event.data.currentPrice,
                currency: 'USD'
              },
              previousPrice: event.data.previousPrice ? {
                value: event.data.previousPrice,
                currency: 'USD'
              } : undefined,
              percentageDrop: event.data.percentageDrop,
              allTimeLow: event.data.allTimeLow,
              url: event.data.url
            }
          }
        }
      },
      relevantAudience: {
        type: 'Unicast',
        payload: {
          user: 'default' // TODO: Get from alert.userId
        }
      }
    };

    const response = await axios.post(
      `${this.apiEndpoint}/api/v1/proactive-events`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    return response;
  }

  /**
   * Truncate text for Alexa speech
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format alert for Alexa speech
   */
  formatSpeechForAlert(alert) {
    const { data, type } = alert;

    switch (type) {
      case 'all_time_low':
        return `All time low alert! ${data.title} is now available at ${data.currentPrice} dollars. This is the lowest price ever. ${data.url}`;

      case 'lightning_deal':
        return `Lightning deal! ${data.title} is now ${data.currentPrice} dollars. Limited time offer. ${data.url}`;

      case 'price_drop':
        const drop = data.percentageDrop;
        return `Price dropped! ${data.title} is now ${data.currentPrice} dollars, down ${drop} percent. ${data.url}`;

      case 'target_reached':
        return `Target price reached! ${data.title} is now ${data.currentPrice} dollars. ${data.url}`;

      default:
        return `Price alert for ${data.title} at ${data.currentPrice} dollars. ${data.url}`;
    }
  }
}

module.exports = AlexaNotifier;
