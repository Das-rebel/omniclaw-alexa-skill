/**
 * Analytics Service
 * Comprehensive tracking of usage, performance, errors, and costs
 *
 * @module apps/analytics/services/analytics-service
 * @version 1.0.0
 */

const { Firestore } = require('@google-cloud/firestore');
const Redis = require('ioredis');

/**
 * Analytics Service Class
 */
class AnalyticsService {
  constructor(options = {}) {
    this.firestore = new Firestore({
      projectId: options.projectId || process.env.PROJECT_ID || 'omniclaw-enhanced',
    });

    this.redis = new Redis({
      host: options.redisHost || process.env.REDIS_HOST || 'localhost',
      port: options.redisPort || process.env.REDIS_PORT || 6379,
      password: options.redisPassword || process.env.REDIS_PASSWORD,
      db: options.redisDb || 0,
    });

    // Collections
    this.collections = {
      events: 'analytics_events',
      metrics: 'analytics_metrics',
      reports: 'analytics_reports',
    };

    // TTL configurations
    this.ttl = {
      rawEvents: 7 * 24 * 60 * 60,      // 7 days for raw events
      dailyMetrics: 90 * 24 * 60 * 60,   // 90 days for daily metrics
      hourlyMetrics: 30 * 24 * 60 * 60,  // 30 days for hourly metrics
      summaries: 365 * 24 * 60 * 60,     // 1 year for summaries
    };
  }

  /**
   * Track an event
   * @param {string} type - Event type (request, error, feature_use, etc.)
   * @param {object} data - Event data
   * @param {object} metadata - Event metadata
   */
  async trackEvent(type, data = {}, metadata = {}) {
    const event = {
      type,
      data,
      metadata,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0], // For querying
      hour: new Date().getHours(), // For hourly aggregation
    };

    // Store in Firestore
    await this.firestore
      .collection(this.collections.events)
      .add(event);

    // Store in Redis for real-time analytics
    const redisKey = `analytics:event:${type}:${Date.now()}`;
    await this.redis.setex(redisKey, this.ttl.rawEvents, JSON.stringify(event));

    // Update counters in Redis
    await this._updateCounters(event);

    return event;
  }

  /**
   * Track a request
   * @param {object} request - Request data
   */
  async trackRequest(request) {
    const {
      function: functionName,
      endpoint,
      method = 'POST',
      userId,
      sessionId,
      queryType,
      provider,
      latency,
      success = true,
      errorCode = null,
      errorMessage = null,
      tokensUsed = 0,
      cost = 0,
    } = request;

    await this.trackEvent('request', {
      function: functionName,
      endpoint,
      method,
      queryType,
      provider,
      latency,
      success,
      errorCode,
      errorMessage,
      tokensUsed,
      cost,
    }, {
      userId,
      sessionId,
    });

    // Update performance metrics
    await this._updatePerformanceMetrics(functionName, {
      latency,
      success,
      provider,
      queryType,
    });

    // Update cost metrics
    if (cost > 0) {
      await this._updateCostMetrics(functionName, provider, cost);
    }
  }

  /**
   * Track feature usage
   * @param {string} feature - Feature name (email, price, media, story)
   * @param {string} action - Action performed (read, draft, play, etc.)
   * @param {object} metadata - Additional metadata
   */
  async trackFeatureUse(feature, action, metadata = {}) {
    await this.trackEvent('feature_use', {
      feature,
      action,
      ...metadata,
    });
  }

  /**
   * Track an error
   * @param {Error} error - Error object
   * @param {object} context - Error context
   */
  async trackError(error, context = {}) {
    await this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...context,
    });
  }

  /**
   * Update counters in Redis
   * @private
   */
  async _updateCounters(event) {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // Daily counter
    const dailyKey = `analytics:daily:${today}:${event.type}`;
    await this.redis.incr(dailyKey);
    await this.redis.expire(dailyKey, this.ttl.dailyMetrics);

    // Hourly counter
    const hourlyKey = `analytics:hourly:${today}:${hour}:${event.type}`;
    await this.redis.incr(hourlyKey);
    await this.redis.expire(hourlyKey, this.ttl.hourlyMetrics);

    // Feature-specific counters
    if (event.type === 'feature_use') {
      const featureKey = `analytics:feature:${event.data.feature}:${today}`;
      await this.redis.incr(featureKey);
      await this.redis.expire(featureKey, this.ttl.dailyMetrics);
    }

    // Provider-specific counters
    if (event.data.provider) {
      const providerKey = `analytics:provider:${event.data.provider}:${today}`;
      await this.redis.incr(providerKey);
      await this.redis.expire(providerKey, this.ttl.dailyMetrics);
    }
  }

  /**
   * Update performance metrics
   * @private
   */
  async _updatePerformanceMetrics(functionName, metrics) {
    const today = new Date().toISOString().split('T')[0];
    const { latency, success, provider, queryType } = metrics;

    // Store latency for percentile calculation
    const latencyKey = `analytics:latency:${functionName}:${today}`;
    await this.redis.lpush(latencyKey, latency);
    await this.redis.ltrim(latencyKey, 0, 9999); // Keep last 10k measurements
    await this.redis.expire(latencyKey, this.ttl.dailyMetrics);

    // Update success rate
    const successKey = `analytics:success:${functionName}:${today}`;
    if (success) {
      await this.redis.hincrby(successKey, 'total', 1);
      await this.redis.hincrby(successKey, 'success', 1);
    } else {
      await this.redis.hincrby(successKey, 'total', 1);
    }
    await this.redis.expire(successKey, this.ttl.dailyMetrics);

    // Query type performance
    if (queryType) {
      const queryTypeKey = `analytics:querytype:${queryType}:${today}`;
      await this.redis.hincrby(queryTypeKey, 'count', 1);
      await this.redis.hincrbyfloat(queryTypeKey, 'total_latency', latency);
      await this.redis.expire(queryTypeKey, this.ttl.dailyMetrics);
    }
  }

  /**
   * Update cost metrics
   * @private
   */
  async _updateCostMetrics(functionName, provider, cost) {
    const today = new Date().toISOString().split('T')[0];
    const costKey = `analytics:cost:${provider || functionName}:${today}`;
    await this.redis.hincrbyfloat(costKey, 'total', cost);
    await this.redis.expire(costKey, this.ttl.dailyMetrics);
  }

  /**
   * Get metrics summary for a time range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {object} - Metrics summary
   */
  async getMetricsSummary(startDate, endDate = new Date().toISOString().split('T')[0]) {
    // Get daily counts from Redis
    const keys = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      keys.push(`analytics:daily:${dateStr}:request`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();

    let totalRequests = 0;
    results.forEach(([err, value]) => {
      if (!err && value) {
        totalRequests += parseInt(value, 10);
      }
    });

    // Get feature usage
    const featureKeys = await this.redis.keys(`analytics:feature:*:${startDate}`);
    const featureUsage = {};
    for (const key of featureKeys) {
      const feature = key.split(':')[2];
      const count = await this.redis.get(key);
      featureUsage[feature] = parseInt(count, 10);
    }

    // Get provider usage
    const providerKeys = await this.redis.keys(`analytics:provider:*:${startDate}`);
    const providerUsage = {};
    for (const key of providerKeys) {
      const provider = key.split(':')[2];
      const count = await this.redis.get(key);
      providerUsage[provider] = parseInt(count, 10);
    }

    return {
      totalRequests,
      featureUsage,
      providerUsage,
      dateRange: { startDate, endDate },
    };
  }

  /**
   * Get performance metrics (percentiles)
   * @param {string} functionName - Function name
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {object} - Performance metrics
   */
  async getPerformanceMetrics(functionName, date = new Date().toISOString().split('T')[0]) {
    const latencyKey = `analytics:latency:${functionName}:${date}`;
    const successKey = `analytics:success:${functionName}:${date}`;

    // Get latencies
    const latencies = await this.redis.lrange(latencyKey, 0, -1);
    const latenciesNum = latencies.map(l => parseFloat(l)).sort((a, b) => a - b);

    // Calculate percentiles
    const p50 = this._percentile(latenciesNum, 50);
    const p95 = this._percentile(latenciesNum, 95);
    const p99 = this._percentile(latenciesNum, 99);
    const avg = latenciesNum.reduce((a, b) => a + b, 0) / latenciesNum.length;

    // Get success rate
    const successData = await this.redis.hgetall(successKey);
    const successRate = successData.total
      ? parseInt(successData.success, 10) / parseInt(successData.total, 10)
      : 1;

    return {
      latency: {
        p50: p50 || 0,
        p95: p95 || 0,
        p99: p99 || 0,
        avg: avg || 0,
        min: latenciesNum[0] || 0,
        max: latenciesNum[latenciesNum.length - 1] || 0,
        count: latenciesNum.length,
      },
      successRate,
      date,
      functionName,
    };
  }

  /**
   * Get cost breakdown
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {object} - Cost breakdown
   */
  async getCostBreakdown(startDate, endDate = new Date().toISOString().split('T')[0]) {
    const costs = {};

    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const keys = await this.redis.keys(`analytics:cost:*:${dateStr}`);

      for (const key of keys) {
        const provider = key.split(':')[2];
        const data = await this.redis.hgetall(key);
        if (data.total) {
          costs[provider] = (costs[provider] || 0) + parseFloat(data.total);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalCost: Object.values(costs).reduce((a, b) => a + b, 0),
      byProvider: costs,
      dateRange: { startDate, endDate },
    };
  }

  /**
   * Calculate percentile
   * @private
   */
  _percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }

  /**
   * Generate daily report
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {object} - Daily report
   */
  async generateDailyReport(date = new Date().toISOString().split('T')[0]) {
    const metrics = await this.getMetricsSummary(date, date);
    const performance = await this.getPerformanceMetrics('all', date);
    const costs = await this.getCostBreakdown(date, date);

    const report = {
      date,
      metrics,
      performance,
      costs,
      generatedAt: new Date().toISOString(),
    };

    // Save report to Firestore
    await this.firestore
      .collection(this.collections.reports)
      .doc(`daily_${date}`)
      .set(report);

    return report;
  }

  /**
   * Get analytics for dashboard
   * @returns {object} - Dashboard data
   */
  async getDashboardData() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [
      todayMetrics,
      yesterdayMetrics,
      performance,
      costs,
    ] = await Promise.all([
      this.getMetricsSummary(today, today),
      this.getMetricsSummary(yesterday, yesterday),
      this.getPerformanceMetrics('all', today),
      this.getCostBreakdown(today, today),
    ]);

    // Calculate trends
    const requestTrend = yesterdayMetrics.totalRequests > 0
      ? ((todayMetrics.totalRequests - yesterdayMetrics.totalRequests) / yesterdayMetrics.totalRequests) * 100
      : 0;

    return {
      overview: {
        totalRequests: todayMetrics.totalRequests,
        requestTrend: requestTrend.toFixed(1) + '%',
        averageLatency: performance.latency.avg.toFixed(0) + 'ms',
        p95Latency: performance.latency.p95.toFixed(0) + 'ms',
        successRate: (performance.successRate * 100).toFixed(1) + '%',
        totalCost: '$' + costs.totalCost.toFixed(2),
      },
      features: todayMetrics.featureUsage,
      providers: todayMetrics.providerUsage,
      performance: performance.latency,
      costs: costs.byProvider,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Clean up old data
   * @param {number} daysToKeep - Number of days to keep
   */
  async cleanup(daysToKeep = 7) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    // Clean up old events from Firestore
    const snapshot = await this.firestore
      .collection(this.collections.events)
      .where('timestamp', '<', cutoffIso)
      .limit(1000)
      .get();

    const batch = this.firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Cleaned up ${snapshot.docs.length} old events`);
  }

  /**
   * Close connections
   */
  async close() {
    await this.redis.quit();
  }
}

module.exports = AnalyticsService;
