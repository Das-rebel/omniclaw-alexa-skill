/**
 * Data Collector - Collects training data from all OmniClaw functions
 *
 * Collects metrics, logs, and usage patterns from:
 * - Cloud Functions (invocations, latency, errors)
 * - API Gateway (requests, response times)
 * - User interactions (intents, entities)
 * - System metrics (CPU, memory, network)
 * - Business metrics (costs, revenue)
 *
 * Target: 500+ lines of production-grade data collection logic
 */

const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const { logger } = require('../../logging/logger');
const { MetricsClient } = require('../../monitoring/metrics-client');

class DataCollector {
  constructor(config = {}) {
    this.firestore = new Firestore();
    this.bigquery = new BigQuery();
    this.storage = new Storage();
    this.metricsClient = new MetricsClient();

    this.config = {
      collectionInterval: config.collectionInterval || 60000, // 1 minute
      batchSize: config.batchSize || 100,
      retentionDays: config.retentionDays || 90,
      rawDataBucket: config.rawDataBucket || 'omniclaw-ml-raw-data',
      processedDataBucket: config.processedDataBucket || 'omniclaw-ml-processed-data',
      ...config
    };

    this.collectionTimers = new Map();
    this.dataBuffers = new Map();
  }

  /**
   * Start continuous data collection
   */
  async startCollection() {
    logger.info('Starting data collection...');

    // Collect function metrics
    this.collectionTimers.set('functions', setInterval(
      () => this.collectFunctionMetrics(),
      this.config.collectionInterval
    ));

    // Collect API gateway metrics
    this.collectionTimers.set('api', setInterval(
      () => this.collectAPIGatewayMetrics(),
      this.config.collectionInterval
    ));

    // Collect user interaction data
    this.collectionTimers.set('interactions', setInterval(
      () => this.collectInteractionData(),
      this.config.collectionInterval
    ));

    // Collect system metrics
    this.collectionTimers.set('system', setInterval(
      () => this.collectSystemMetrics(),
      this.config.collectionInterval
    ));

    // Collect business metrics
    this.collectionTimers.set('business', setInterval(
      () => this.collectBusinessMetrics(),
      this.config.collectionInterval * 5 // Every 5 minutes
    ));

    logger.info('Data collection started for all sources');
  }

  /**
   * Stop data collection
   */
  async stopCollection() {
    logger.info('Stopping data collection...');

    for (const [source, timer] of this.collectionTimers) {
      clearInterval(timer);
      logger.info(`Stopped collection for ${source}`);
    }

    // Flush remaining buffers
    await this.flushAllBuffers();

    this.collectionTimers.clear();
    logger.info('Data collection stopped');
  }

  /**
   * Collect Cloud Function metrics
   */
  async collectFunctionMetrics() {
    try {
      const functions = [
        'omniclaw-health',
        'omniclaw-email',
        'omniclaw-price',
        'omniclaw-media',
        'omniclaw-story',
        'omniclaw-analytics'
      ];

      const metrics = [];

      for (const funcName of functions) {
        const functionMetrics = await this.metricsClient.getFunctionMetrics(funcName);

        metrics.push({
          source: 'cloud-function',
          function: funcName,
          timestamp: new Date().toISOString(),
          invocations: functionMetrics.invocations || 0,
          activeInstances: functionMetrics.activeInstances || 0,
          averageExecutionTime: functionMetrics.averageExecutionTime || 0,
          memoryUsage: functionMetrics.memoryUsage || 0,
          networkEgress: functionMetrics.networkEgress || 0,
          errors: functionMetrics.errors || 0,
          errorRate: this.calculateErrorRate(functionMetrics),
          successRate: this.calculateSuccessRate(functionMetrics),
          coldStarts: functionMetrics.coldStarts || 0,
          coldStartRate: this.calculateColdStartRate(functionMetrics)
        });
      }

      await this.bufferData('functions', metrics);
      logger.debug(`Collected metrics for ${functions.length} functions`);

    } catch (error) {
      logger.error('Error collecting function metrics:', error);
    }
  }

  /**
   * Collect API Gateway metrics
   */
  async collectAPIGatewayMetrics() {
    try {
      const apiMetrics = await this.metricsClient.getAPIGatewayMetrics();

      const metrics = {
        source: 'api-gateway',
        timestamp: new Date().toISOString(),
        totalRequests: apiMetrics.totalRequests || 0,
        successfulRequests: apiMetrics.successfulRequests || 0,
        failedRequests: apiMetrics.failedRequests || 0,
        averageResponseTime: apiMetrics.averageResponseTime || 0,
        p50ResponseTime: apiMetrics.p50ResponseTime || 0,
        p95ResponseTime: apiMetrics.p95ResponseTime || 0,
        p99ResponseTime: apiMetrics.p99ResponseTime || 0,
        requestsPerSecond: apiMetrics.requestsPerSecond || 0,
        uniqueUsers: apiMetrics.uniqueUsers || 0,
        topEndpoints: apiMetrics.topEndpoints || [],
        statusCodes: this.aggregateStatusCodes(apiMetrics.statusCodes || {}),
        rateLimitHits: apiMetrics.rateLimitHits || 0,
        cacheHitRate: apiMetrics.cacheHitRate || 0,
        authenticationFailures: apiMetrics.authenticationFailures || 0
      };

      await this.bufferData('api', [metrics]);
      logger.debug('Collected API gateway metrics');

    } catch (error) {
      logger.error('Error collecting API gateway metrics:', error);
    }
  }

  /**
   * Collect user interaction data
   */
  async collectInteractionData() {
    try {
      // Query recent interactions from Firestore
      const interactionsSnapshot = await this.firestore
        .collection('interactions')
        .where('timestamp', '>=', new Date(Date.now() - this.config.collectionInterval))
        .limit(this.config.batchSize)
        .get();

      const interactions = [];

      interactionsSnapshot.forEach(doc => {
        const data = doc.data();
        interactions.push({
          source: 'user-interaction',
          interactionId: doc.id,
          timestamp: data.timestamp,
          intent: data.intent || 'unknown',
          entities: data.entities || {},
          sentiment: data.sentiment || 'neutral',
          confidence: data.confidence || 0,
          responseTime: data.responseTime || 0,
          userId: data.userId || 'anonymous',
          sessionId: data.sessionId,
          deviceType: data.deviceType,
          location: data.location,
          success: data.success !== false,
          errorType: data.errorType || null,
          followUpRequired: data.followUpRequired || false
        });
      });

      if (interactions.length > 0) {
        await this.bufferData('interactions', interactions);
        logger.debug(`Collected ${interactions.length} user interactions`);
      }

    } catch (error) {
      logger.error('Error collecting interaction data:', error);
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const systemMetrics = await this.metricsClient.getSystemMetrics();

      const metrics = {
        source: 'system',
        timestamp: new Date().toISOString(),
        cpu: {
          usage: systemMetrics.cpu?.usage || 0,
          loadAverage: systemMetrics.cpu?.loadAverage || []
        },
        memory: {
          used: systemMetrics.memory?.used || 0,
          total: systemMetrics.memory?.total || 0,
          percentage: systemMetrics.memory?.percentage || 0,
          heapUsed: systemMetrics.memory?.heapUsed || 0,
          heapTotal: systemMetrics.memory?.heapTotal || 0
        },
        network: {
          bytesReceived: systemMetrics.network?.bytesReceived || 0,
          bytesSent: systemMetrics.network?.bytesSent || 0,
          packetsReceived: systemMetrics.network?.packetsReceived || 0,
          packetsSent: systemMetrics.network?.packetsSent || 0,
          errors: systemMetrics.network?.errors || 0
        },
        disk: {
          used: systemMetrics.disk?.used || 0,
          total: systemMetrics.disk?.total || 0,
          percentage: systemMetrics.disk?.percentage || 0,
          readOps: systemMetrics.disk?.readOps || 0,
          writeOps: systemMetrics.disk?.writeOps || 0
        },
        database: {
          connections: systemMetrics.database?.connections || 0,
          queryCount: systemMetrics.database?.queryCount || 0,
          averageQueryTime: systemMetrics.database?.averageQueryTime || 0,
          slowQueries: systemMetrics.database?.slowQueries || 0
        },
        cache: {
          hitRate: systemMetrics.cache?.hitRate || 0,
          missRate: systemMetrics.cache?.missRate || 0,
          memoryUsage: systemMetrics.cache?.memoryUsage || 0,
          evictionCount: systemMetrics.cache?.evictionCount || 0
        }
      };

      await this.bufferData('system', [metrics]);
      logger.debug('Collected system metrics');

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Collect business metrics
   */
  async collectBusinessMetrics() {
    try {
      // Collect cost data
      const costData = await this.collectCostData();

      // Collect usage analytics
      const usageData = await this.collectUsageAnalytics();

      // Collect performance data
      const performanceData = await this.collectPerformanceMetrics();

      const metrics = {
        source: 'business',
        timestamp: new Date().toISOString(),
        costs: costData,
        usage: usageData,
        performance: performanceData
      };

      await this.bufferData('business', [metrics]);
      logger.debug('Collected business metrics');

    } catch (error) {
      logger.error('Error collecting business metrics:', error);
    }
  }

  /**
   * Collect cost data
   */
  async collectCostData() {
    try {
      // Query cost data from BigQuery
      const query = `
        SELECT
          service_description,
          sku_id,
          usage_amount,
          cost,
          usage_unit,
          usage_start_time,
          usage_end_time
        FROM
          \`omniclaw-enhanced.billing.gcp_billing_export_v1_\`
        WHERE
          usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        ORDER BY
          usage_start_time DESC
        LIMIT 1000
      `;

      const [rows] = await this.bigquery.query(query);

      // Aggregate costs by service
      const costsByService = {};
      let totalCost = 0;

      rows.forEach(row => {
        const service = row.service_description || 'unknown';
        if (!costsByService[service]) {
          costsByService[service] = { cost: 0, usage: 0 };
        }
        costsByService[service].cost += parseFloat(row.cost || 0);
        costsByService[service].usage += parseFloat(row.usage_amount || 0);
        totalCost += parseFloat(row.cost || 0);
      });

      return {
        totalCost,
        costsByService,
        period: '24h',
        currency: 'USD'
      };

    } catch (error) {
      logger.error('Error collecting cost data:', error);
      return { totalCost: 0, costsByService: {}, period: '24h', currency: 'USD' };
    }
  }

  /**
   * Collect usage analytics
   */
  async collectUsageAnalytics() {
    try {
      const analyticsSnapshot = await this.firestore
        .collection('analytics')
        .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .get();

      const dailyActiveUsers = new Set();
      const totalRequests = analyticsSnapshot.size;
      const intentCounts = {};
      const deviceCounts = {};

      analyticsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId) dailyActiveUsers.add(data.userId);

        const intent = data.intent || 'unknown';
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;

        const device = data.deviceType || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });

      return {
        dailyActiveUsers: dailyActiveUsers.size,
        totalRequests,
        averageRequestsPerUser: dailyActiveUsers.size > 0 ? totalRequests / dailyActiveUsers.size : 0,
        topIntents: this.getTopItems(intentCounts, 10),
        topDevices: this.getTopItems(deviceCounts, 5)
      };

    } catch (error) {
      logger.error('Error collecting usage analytics:', error);
      return {
        dailyActiveUsers: 0,
        totalRequests: 0,
        averageRequestsPerUser: 0,
        topIntents: [],
        topDevices: []
      };
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      const performanceSnapshot = await this.firestore
        .collection('performance')
        .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .get();

      const responseTimes = [];
      const errorCounts = {};

      performanceSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.responseTime) responseTimes.push(data.responseTime);
        if (data.errorType) {
          errorCounts[data.errorType] = (errorCounts[data.errorType] || 0) + 1;
        }
      });

      responseTimes.sort((a, b) => a - b);

      return {
        averageResponseTime: this.calculateAverage(responseTimes),
        medianResponseTime: this.calculateMedian(responseTimes),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        totalErrors: Object.values(errorCounts).reduce((sum, count) => sum + count, 0),
        topErrors: this.getTopItems(errorCounts, 10)
      };

    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
      return {
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalErrors: 0,
        topErrors: []
      };
    }
  }

  /**
   * Buffer data for batch processing
   */
  async bufferData(source, data) {
    if (!this.dataBuffers.has(source)) {
      this.dataBuffers.set(source, []);
    }

    const buffer = this.dataBuffers.get(source);
    buffer.push(...data);

    // Flush buffer if it exceeds batch size
    if (buffer.length >= this.config.batchSize) {
      await this.flushBuffer(source);
    }
  }

  /**
   * Flush a specific buffer
   */
  async flushBuffer(source) {
    const buffer = this.dataBuffers.get(source);
    if (!buffer || buffer.length === 0) return;

    try {
      // Upload to Cloud Storage
      const filename = `${source}/${Date.now()}.json`;
      const file = this.storage.bucket(this.config.rawDataBucket).file(filename);

      await file.save(JSON.stringify(buffer, null, 2));
      logger.info(`Flushed ${buffer.length} records from ${source} to ${filename}`);

      // Clear buffer
      this.dataBuffers.set(source, []);

    } catch (error) {
      logger.error(`Error flushing buffer for ${source}:`, error);
    }
  }

  /**
   * Flush all buffers
   */
  async flushAllBuffers() {
    for (const source of this.dataBuffers.keys()) {
      await this.flushBuffer(source);
    }
  }

  /**
   * Get historical data for training
   */
  async getHistoricalData(source, startDate, endDate) {
    try {
      const query = {
        collection: 'ml_training_data',
        where: [
          { field: 'source', op: '==', value: source },
          { field: 'timestamp', op: '>=', value: startDate.toISOString() },
          { field: 'timestamp', op: '<=', value: endDate.toISOString() }
        ]
      };

      const snapshot = await this.firestore.collection('ml_training_data')
        .where('source', '==', source)
        .where('timestamp', '>=', startDate.toISOString())
        .where('timestamp', '<=', endDate.toISOString())
        .get();

      return snapshot.docs.map(doc => doc.data());

    } catch (error) {
      logger.error(`Error getting historical data for ${source}:`, error);
      return [];
    }
  }

  /**
   * Export data for training
   */
  async exportTrainingData(sources, startDate, endDate) {
    const allData = [];

    for (const source of sources) {
      const data = await this.getHistoricalData(source, startDate, endDate);
      allData.push(...data);
    }

    // Export to Cloud Storage
    const filename = `training/${startDate.toISOString()}_${endDate.toISOString()}.json`;
    const file = this.storage.bucket(this.config.processedDataBucket).file(filename);

    await file.save(JSON.stringify(allData, null, 2));
    logger.info(`Exported ${allData.length} records to ${filename}`);

    return {
      filename,
      recordCount: allData.length,
      size: Buffer.byteLength(JSON.stringify(allData), 'utf8')
    };
  }

  // Helper methods
  calculateErrorRate(metrics) {
    const total = (metrics.invocations || 0);
    const errors = (metrics.errors || 0);
    return total > 0 ? errors / total : 0;
  }

  calculateSuccessRate(metrics) {
    return 1 - this.calculateErrorRate(metrics);
  }

  calculateColdStartRate(metrics) {
    const total = (metrics.invocations || 0);
    const coldStarts = (metrics.coldStarts || 0);
    return total > 0 ? coldStarts / total : 0;
  }

  aggregateStatusCodes(statusCodes) {
    const aggregated = {};
    for (const [code, count] of Object.entries(statusCodes)) {
      const category = Math.floor(code / 100);
      aggregated[`${category}xx`] = (aggregated[`${category}xx`] || 0) + count;
    }
    return aggregated;
  }

  getTopItems(obj, limit) {
    return Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, value]) => ({ key, value }));
  }

  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * arr.length) - 1;
    return arr[index];
  }
}

module.exports = { DataCollector };
