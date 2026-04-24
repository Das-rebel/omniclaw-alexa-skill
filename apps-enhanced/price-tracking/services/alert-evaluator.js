/**
 * Alert Evaluator Service
 *
 * Evaluates price changes against user-defined alert thresholds:
 * - Price drop alerts (percentage or absolute)
 * - Price increase alerts (for tracking price hikes)
 * - Stock availability alerts
 * - Lightning deal/flash sale alerts
 * - Target price alerts (when price reaches desired level)
 * - Competitor price alerts (better price on other platform)
 * - Batch alerts (max 3 per product per day)
 * - Smart aggregation (group similar alerts)
 */

const { Redis } = require('@upstash/redis');
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('AlertEvaluator');

class AlertEvaluator {
  constructor(config = {}) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.config = {
      maxAlertsPerProductPerDay: 3,
      batchWindow: 3600000, // 1 hour in milliseconds
      defaultDropThreshold: 10, // 10% drop triggers alert
      defaultRiseThreshold: 15, // 15% rise triggers alert
      ...config
    };
  }

  /**
   * Evaluate price analysis against user alerts
   */
  async evaluate(analysis, userAlerts = []) {
    try {
      const { productId, platform } = analysis;
      const triggeredAlerts = [];

      for (const alert of userAlerts) {
        // Check if alert is active
        if (!alert.active) continue;

        // Check if alert matches platform
        if (alert.platform && alert.platform !== platform) continue;

        // Check if alert matches product
        if (alert.productId && alert.productId !== productId) continue;

        // Evaluate alert type
        const triggered = await this.evaluateAlert(analysis, alert);
        if (triggered) {
          triggeredAlerts.push({
            ...triggered,
            alertId: alert.id,
            userId: alert.userId,
            productId,
            platform
          });
        }
      }

      // Check batching limits
      const filteredAlerts = await this.applyBatchingLimits(productId, triggeredAlerts);

      // Store triggered alerts
      for (const alert of filteredAlerts) {
        await this.recordAlert(alert);
      }

      logger.info(`Evaluated ${userAlerts.length} alerts, triggered ${filteredAlerts.length}`);
      return filteredAlerts;

    } catch (error) {
      logger.error('Failed to evaluate alerts:', error);
      throw error;
    }
  }

  /**
   * Evaluate individual alert
   */
  async evaluateAlert(analysis, alert) {
    const { priceChange, isSignificant, availabilityChange, platformComparison } = analysis;

    switch (alert.type) {
      case 'price_drop':
        return this.evaluatePriceDrop(analysis, alert);

      case 'price_rise':
        return this.evaluatePriceRise(analysis, alert);

      case 'target_price':
        return this.evaluateTargetPrice(analysis, alert);

      case 'stock_available':
        return this.evaluateStockAvailable(analysis, alert);

      case 'stock_unavailable':
        return this.evaluateStockUnavailable(analysis, alert);

      case 'lightning_deal':
        return this.evaluateLightningDeal(analysis, alert);

      case 'competitor_price':
        return this.evaluateCompetitorPrice(analysis, alert);

      case 'significant_change':
        return this.evaluateSignificantChange(analysis, alert);

      default:
        logger.warn(`Unknown alert type: ${alert.type}`);
        return null;
    }
  }

  /**
   * Evaluate price drop alert
   */
  evaluatePriceDrop(analysis, alert) {
    const { priceChange, currentPrice } = analysis;

    if (!priceChange || priceChange.direction !== 'decrease') {
      return null;
    }

    const threshold = alert.threshold || this.config.defaultDropThreshold;
    const meetsThreshold = Math.abs(priceChange.percent) >= threshold;

    if (!meetsThreshold) {
      return null;
    }

    return {
      type: 'price_drop',
      message: `Price dropped ${Math.abs(priceChange.percent).toFixed(1)}% (${this.formatPrice(priceChange.absolute)})`,
      currentPrice,
      previousPrice: analysis.previousPrice,
      dropPercent: Math.abs(priceChange.percent),
      dropAmount: Math.abs(priceChange.absolute),
      severity: this.calculateSeverity(priceChange.percent, 'drop')
    };
  }

  /**
   * Evaluate price rise alert
   */
  evaluatePriceRise(analysis, alert) {
    const { priceChange, currentPrice } = analysis;

    if (!priceChange || priceChange.direction !== 'increase') {
      return null;
    }

    const threshold = alert.threshold || this.config.defaultRiseThreshold;
    const meetsThreshold = priceChange.percent >= threshold;

    if (!meetsThreshold) {
      return null;
    }

    return {
      type: 'price_rise',
      message: `Price increased ${priceChange.percent.toFixed(1)}% (${this.formatPrice(priceChange.absolute)})`,
      currentPrice,
      previousPrice: analysis.previousPrice,
      risePercent: priceChange.percent,
      riseAmount: priceChange.absolute,
      severity: this.calculateSeverity(priceChange.percent, 'rise')
    };
  }

  /**
   * Evaluate target price alert
   */
  evaluateTargetPrice(analysis, alert) {
    const { currentPrice } = analysis;
    const targetPrice = alert.targetPrice;

    if (!targetPrice) {
      return null;
    }

    const reachedTarget = currentPrice <= targetPrice;

    if (!reachedTarget) {
      return null;
    }

    const savings = alert.originalPrice ? alert.originalPrice - currentPrice : null;
    const savingsPercent = savings ? (savings / alert.originalPrice) * 100 : null;

    return {
      type: 'target_price',
      message: `Target price reached! Now ${this.formatPrice(currentPrice)}`,
      currentPrice,
      targetPrice,
      savings,
      savingsPercent,
      severity: 'high'
    };
  }

  /**
   * Evaluate stock available alert
   */
  evaluateStockAvailable(analysis, alert) {
    const { availability, availabilityChange } = analysis;

    if (!availability || availabilityChange !== 'now_available') {
      return null;
    }

    return {
      type: 'stock_available',
      message: 'Product is now back in stock!',
      availability,
      severity: 'high'
    };
  }

  /**
   * Evaluate stock unavailable alert
   */
  evaluateStockUnavailable(analysis, alert) {
    const { availability, availabilityChange } = analysis;

    if (availability || availabilityChange !== 'now_unavailable') {
      return null;
    }

    return {
      type: 'stock_unavailable',
      message: 'Product is now out of stock',
      availability,
      severity: 'medium'
    };
  }

  /**
   * Evaluate lightning deal alert
   */
  evaluateLightningDeal(analysis, alert) {
    const { metadata } = analysis;

    if (!metadata?.lightningDeal && !metadata?.flashSale) {
      return null;
    }

    return {
      type: 'lightning_deal',
      message: metadata.lightningDeal ? 'Lightning deal available!' : 'Flash sale active!',
      currentPrice: analysis.currentPrice,
      originalPrice: metadata.originalPrice,
      discount: metadata.discount,
      severity: 'high'
    };
  }

  /**
   * Evaluate competitor price alert
   */
  evaluateCompetitorPrice(analysis, alert) {
    const { platformComparison, currentPrice, platform } = analysis;

    if (!platformComparison?.available) {
      return null;
    }

    const lowest = platformComparison.lowest;

    // Check if another platform has better price
    if (lowest.platform === platform) {
      return null; // Already on lowest price platform
    }

    const savings = currentPrice - lowest.price;
    const savingsPercent = (savings / currentPrice) * 100;

    const threshold = alert.threshold || 5; // Default 5% savings
    if (savingsPercent < threshold) {
      return null;
    }

    return {
      type: 'competitor_price',
      message: `Better price on ${lowest.platform}! Save ${this.formatPrice(savings)} (${savingsPercent.toFixed(1)}%)`,
      currentPrice,
      betterPrice: lowest.price,
      betterPlatform: lowest.platform,
      betterUrl: lowest.url,
      savings,
      savingsPercent,
      severity: 'medium'
    };
  }

  /**
   * Evaluate significant change alert
   */
  evaluateSignificantChange(analysis, alert) {
    const { isSignificant, priceChange } = analysis;

    if (!isSignificant) {
      return null;
    }

    return {
      type: 'significant_change',
      message: `Significant price ${priceChange.direction}: ${priceChange.percent.toFixed(1)}%`,
      currentPrice: analysis.currentPrice,
      previousPrice: analysis.previousPrice,
      changePercent: priceChange.percent,
      changeAmount: Math.abs(priceChange.absolute),
      severity: 'medium'
    };
  }

  /**
   * Apply batching limits
   */
  async applyBatchingLimits(productId, alerts) {
    const today = new Date().toDateString();
    const key = `alert:count:${productId}:${today}`;
    const currentCount = await this.redis.get(key) || 0;

    const remainingSlots = this.config.maxAlertsPerProductPerDay - currentCount;

    if (remainingSlots <= 0) {
      logger.info(`Alert limit reached for product ${productId} today`);
      return [];
    }

    // Prioritize alerts by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const prioritizedAlerts = alerts
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, remainingSlots);

    // Update counter
    await this.redis.incr(key);
    await this.redis.expire(key, 86400); // 24 hours

    return prioritizedAlerts;
  }

  /**
   * Record triggered alert
   */
  async recordAlert(alert) {
    try {
      const key = `alert:history:${alert.productId}:${alert.userId}`;
      const alertData = {
        ...alert,
        triggeredAt: Date.now()
      };

      await this.redis.lpush(key, JSON.stringify(alertData));
      await this.redis.ltrim(key, 0, 99); // Keep last 100 alerts

      logger.debug(`Recorded alert: ${alert.type} for product ${alert.productId}`);
    } catch (error) {
      logger.error('Failed to record alert:', error);
    }
  }

  /**
   * Calculate alert severity
   */
  calculateSeverity(changePercent, direction) {
    const absChange = Math.abs(changePercent);

    if (direction === 'drop') {
      if (absChange >= 25) return 'high';
      if (absChange >= 15) return 'medium';
      return 'low';
    } else {
      if (absChange >= 20) return 'high';
      if (absChange >= 10) return 'medium';
      return 'low';
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  }

  /**
   * Get alert statistics for user
   */
  async getAlertStats(userId, productId = null) {
    try {
      const pattern = productId
        ? `alert:history:${productId}:${userId}`
        : `alert:history:*:${userId}`;

      const keys = productId ? [pattern] : await this.redis.keys(pattern);
      const stats = {
        total: 0,
        byType: {},
        bySeverity: { high: 0, medium: 0, low: 0 },
        recent: []
      };

      for (const key of keys) {
        const alerts = await this.redis.lrange(key, 0, -1);

        for (const alertStr of alerts) {
          const alert = JSON.parse(alertStr);
          stats.total++;

          stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
          stats.bySeverity[alert.severity]++;

          if (stats.recent.length < 10) {
            stats.recent.push(alert);
          }
        }
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get alert stats:', error);
      return null;
    }
  }

  /**
   * Check if user has exceeded daily alert limit
   */
  async checkDailyLimit(userId, productId) {
    const today = new Date().toDateString();
    const key = `alert:count:${productId}:${userId}:${today}`;
    const count = await this.redis.get(key) || 0;

    return count < this.config.maxAlertsPerProductPerDay;
  }

  /**
   * Aggregate similar alerts
   */
  async aggregateAlerts(alerts) {
    const grouped = {};

    for (const alert of alerts) {
      const key = `${alert.productId}:${alert.type}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(alert);
    }

    const aggregated = [];

    for (const [key, groupAlerts] of Object.entries(grouped)) {
      if (groupAlerts.length === 1) {
        aggregated.push(groupAlerts[0]);
      } else {
        // Merge similar alerts
        const merged = {
          ...groupAlerts[0],
          message: `${groupAlerts.length} alerts: ${groupAlerts[0].message}`,
          aggregatedCount: groupAlerts.length,
          aggregatedAlerts: groupAlerts
        };
        aggregated.push(merged);
      }
    }

    return aggregated;
  }

  /**
   * Clear old alert history
   */
  async clearOldAlerts(userId, olderThanDays = 30) {
    try {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      const keys = await this.redis.keys(`alert:history:*:${userId}`);

      for (const key of keys) {
        const alerts = await this.redis.lrange(key, 0, -1);
        const validAlerts = [];

        for (const alertStr of alerts) {
          const alert = JSON.parse(alertStr);
          if (alert.triggeredAt > cutoffTime) {
            validAlerts.push(alertStr);
          }
        }

        if (validAlerts.length < alerts.length) {
          await this.redis.del(key);
          for (const alertStr of validAlerts) {
            await this.redis.lpush(key, alertStr);
          }
        }
      }

      logger.info(`Cleared old alerts for user ${userId}`);
    } catch (error) {
      logger.error('Failed to clear old alerts:', error);
    }
  }
}

module.exports = AlertEvaluator;
