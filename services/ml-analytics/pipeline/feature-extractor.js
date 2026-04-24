/**
 * Feature Extractor - Extracts ML features from raw data
 *
 * Extracts features for:
 * - Time series patterns (trends, seasonality)
 * - Statistical features (mean, variance, percentiles)
 * - Behavioral patterns (user journeys, intents)
 * - System health indicators
 * - Cost and performance metrics
 *
 * Target: 600+ lines of feature engineering logic
 */

const { logger } = require('../../logging/logger');

class FeatureExtractor {
  constructor(config = {}) {
    this.config = {
      windowSize: config.windowSize || 24, // hours
      lagFeatures: config.lagFeatures || [1, 2, 3, 6, 12, 24],
      rollingWindows: config.rollingWindows || [6, 12, 24, 48, 168], // hours
      percentileBuckets: config.percentileBuckets || [10, 25, 50, 75, 90, 95, 99],
      ...config
    };
  }

  /**
   * Extract all features from collected data
   */
  async extractFeatures(data) {
    try {
      const features = {
        temporal: this.extractTemporalFeatures(data),
        statistical: this.extractStatisticalFeatures(data),
        trend: this.extractTrendFeatures(data),
        seasonal: this.extractSeasonalFeatures(data),
        behavioral: this.extractBehavioralFeatures(data),
        system: this.extractSystemFeatures(data),
        business: this.extractBusinessFeatures(data),
        lag: this.extractLagFeatures(data),
        rolling: this.extractRollingFeatures(data),
        interaction: this.extractInteractionFeatures(data)
      };

      // Validate and clean features
      const cleanedFeatures = this.cleanFeatures(features);

      logger.info(`Extracted ${this.countFeatures(cleanedFeatures)} features`);
      return cleanedFeatures;

    } catch (error) {
      logger.error('Error extracting features:', error);
      throw error;
    }
  }

  /**
   * Extract temporal features
   */
  extractTemporalFeatures(data) {
    const timestamp = new Date(data.timestamp || Date.now());

    return {
      // Basic time components
      hour: timestamp.getHours(),
      day: timestamp.getDay(),
      dayOfMonth: timestamp.getDate(),
      month: timestamp.getMonth(),
      quarter: Math.floor(timestamp.getMonth() / 3) + 1,
      year: timestamp.getFullYear(),

      // Time-based indicators
      isWeekend: [0, 6].includes(timestamp.getDay()),
      isBusinessHour: timestamp.getHours() >= 9 && timestamp.getHours() < 17,
      isPeakHour: timestamp.getHours() >= 18 && timestamp.getHours() < 22,
      isMorning: timestamp.getHours() >= 6 && timestamp.getHours() < 12,
      isAfternoon: timestamp.getHours() >= 12 && timestamp.getHours() < 18,
      isEvening: timestamp.getHours() >= 18 && timestamp.getHours() < 22,
      isNight: timestamp.getHours() >= 22 || timestamp.getHours() < 6,

      // Cyclical features (sine/cosine encoding)
      hourSin: Math.sin(2 * Math.PI * timestamp.getHours() / 24),
      hourCos: Math.cos(2 * Math.PI * timestamp.getHours() / 24),
      daySin: Math.sin(2 * Math.PI * timestamp.getDay() / 7),
      dayCos: Math.cos(2 * Math.PI * timestamp.getDay() / 7),
      monthSin: Math.sin(2 * Math.PI * timestamp.getMonth() / 12),
      monthCos: Math.cos(2 * Math.PI * timestamp.getMonth() / 12),

      // Special time periods
      isHoliday: this.isHoliday(timestamp),
      isPayday: this.isPayday(timestamp),
      isMonthStart: timestamp.getDate() <= 3,
      isMonthEnd: timestamp.getDate() >= 28,
      isQuarterStart: timestamp.getMonth() % 3 === 0,
      isQuarterEnd: timestamp.getMonth() % 3 === 2,

      // Unix timestamp for absolute time
      unixTimestamp: Math.floor(timestamp.getTime() / 1000)
    };
  }

  /**
   * Extract statistical features
   */
  extractStatisticalFeatures(data) {
    const values = this.extractNumericValues(data);

    if (values.length === 0) {
      return this.getDefaultStatisticalFeatures();
    }

    values.sort((a, b) => a - b);

    return {
      // Central tendency
      mean: this.calculateMean(values),
      median: this.calculateMedian(values),
      mode: this.calculateMode(values),
      geometricMean: this.calculateGeometricMean(values),
      harmonicMean: this.calculateHarmonicMean(values),

      // Dispersion
      variance: this.calculateVariance(values),
      standardDeviation: this.calculateStandardDeviation(values),
      coefficientOfVariation: this.calculateCoefficientOfVariation(values),
      range: values[values.length - 1] - values[0],
      interquartileRange: this.calculateInterquartileRange(values),

      // Distribution shape
      skewness: this.calculateSkewness(values),
      kurtosis: this.calculateKurtosis(values),

      // Percentiles
      min: values[0],
      max: values[values.length - 1],
      p10: this.calculatePercentile(values, 10),
      p25: this.calculatePercentile(values, 25),
      p75: this.calculatePercentile(values, 75),
      p90: this.calculatePercentile(values, 90),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),

      // Count features
      count: values.length,
      sum: values.reduce((sum, val) => sum + val, 0),
      product: values.reduce((prod, val) => prod * val, 1)
    };
  }

  /**
   * Extract trend features
   */
  extractTrendFeatures(data) {
    const timeSeries = this.extractTimeSeries(data);

    if (timeSeries.length < 2) {
      return {
        trend: 0,
        trendSlope: 0,
        trendStrength: 0,
        isIncreasing: false,
        isDecreasing: false,
        isStable: true
      };
    }

    // Linear regression to find trend
    const n = timeSeries.length;
    const xValues = timeSeries.map((_, i) => i);
    const yValues = timeSeries;

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for trend strength
    const predictions = xValues.map(x => slope * x + intercept);
    const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - predictions[i], 2), 0);
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - this.calculateMean(yValues), 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return {
      trend: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
      trendSlope: slope,
      trendIntercept: intercept,
      trendStrength: rSquared,
      isIncreasing: slope > 0.01,
      isDecreasing: slope < -0.01,
      isStable: Math.abs(slope) <= 0.01,
      rSquared
    };
  }

  /**
   * Extract seasonal features
   */
  extractSeasonalFeatures(data) {
    const timeSeries = this.extractTimeSeries(data);

    if (timeSeries.length < 24) {
      return {
        dailySeasonality: 0,
        weeklySeasonality: 0,
        hasSeasonality: false
      };
    }

    // Detect daily seasonality (24-hour pattern)
    const dailySeasonality = this.detectDailySeasonality(timeSeries);

    // Detect weekly seasonality (7-day pattern)
    const weeklySeasonality = this.detectWeeklySeasonality(timeSeries);

    return {
      dailySeasonality,
      weeklySeasonality,
      hasSeasonality: dailySeasonality > 0.3 || weeklySeasonality > 0.3,
      peakHourOfDay: this.findPeakHour(timeSeries),
      peakDayOfWeek: this.findPeakDay(timeSeries)
    };
  }

  /**
   * Extract behavioral features
   */
  extractBehavioralFeatures(data) {
    const interactions = data.interactions || [];

    return {
      // User engagement
      totalInteractions: interactions.length,
      uniqueUsers: new Set(interactions.map(i => i.userId)).size,
      averageInteractionsPerUser: interactions.length / Math.max(new Set(interactions.map(i => i.userId)).size, 1),

      // Intent distribution
      topIntent: this.getMostFrequent(interactions.map(i => i.intent)),
      intentDiversity: this.calculateDiversity(interactions.map(i => i.intent)),
      intentEntropy: this.calculateEntropy(interactions.map(i => i.intent)),

      // Session patterns
      averageSessionLength: this.calculateMean(interactions.map(i => i.sessionLength || 0)),
      averageActionsPerSession: this.calculateMean(interactions.map(i => i.actionsPerSession || 1)),

      // Success metrics
      successRate: this.calculateRate(interactions.map(i => i.success !== false)),
      errorRate: this.calculateRate(interactions.map(i => i.errorType != null)),

      // Sentiment
      averageSentiment: this.calculateMean(interactions.map(i => this.sentimentToScore(i.sentiment))),
      positiveSentimentRate: this.calculateRate(interactions.map(i => i.sentiment === 'positive')),
      negativeSentimentRate: this.calculateRate(interactions.map(i => i.sentiment === 'negative')),

      // Follow-up patterns
      followUpRate: this.calculateRate(interactions.map(i => i.followUpRequired)),
      averageFollowUpCount: this.calculateMean(interactions.map(i => i.followUpCount || 0))
    };
  }

  /**
   * Extract system features
   */
  extractSystemFeatures(data) {
    const system = data.system || {};

    return {
      // CPU features
      cpuUsage: system.cpu?.usage || 0,
      cpuLoadAverage1m: system.cpu?.loadAverage?.[0] || 0,
      cpuLoadAverage5m: system.cpu?.loadAverage?.[1] || 0,
      cpuLoadAverage15m: system.cpu?.loadAverage?.[2] || 0,
      cpuTrend: this.calculateTrend([system.cpu?.usage || 0]),

      // Memory features
      memoryUsage: system.memory?.usage || 0,
      memoryPercentage: system.memory?.percentage || 0,
      memoryHeapUsed: system.memory?.heapUsed || 0,
      memoryHeapTotal: system.memory?.heapTotal || 0,
      memoryTrend: this.calculateTrend([system.memory?.percentage || 0]),

      // Network features
      networkBytesReceived: system.network?.bytesReceived || 0,
      networkBytesSent: system.network?.bytesSent || 0,
      networkTotalBytes: (system.network?.bytesReceived || 0) + (system.network?.bytesSent || 0),
      networkErrors: system.network?.errors || 0,
      networkErrorRate: this.calculateRate([system.network?.errors || 0]),

      // Database features
      databaseConnections: system.database?.connections || 0,
      databaseQueryCount: system.database?.queryCount || 0,
      databaseAverageQueryTime: system.database?.averageQueryTime || 0,
      databaseSlowQueries: system.database?.slowQueries || 0,

      // Cache features
      cacheHitRate: system.cache?.hitRate || 0,
      cacheMissRate: system.cache?.missRate || 0,
      cacheMemoryUsage: system.cache?.memoryUsage || 0,
      cacheEvictionRate: this.calculateRate([system.cache?.evictionCount || 0])
    };
  }

  /**
   * Extract business features
   */
  extractBusinessFeatures(data) {
    const business = data.business || {};

    return {
      // Cost features
      totalCost: business.costs?.totalCost || 0,
      costPerRequest: this.calculateCostPerRequest(business),
      costTrend: this.calculateTrend([business.costs?.totalCost || 0]),
      costPerUser: this.calculateCostPerUser(business),

      // Usage features
      dailyActiveUsers: business.usage?.dailyActiveUsers || 0,
      totalRequests: business.usage?.totalRequests || 0,
      requestsPerUser: business.usage?.averageRequestsPerUser || 0,
      userGrowthRate: this.calculateGrowthRate(business.usage?.dailyActiveUsers || 0),

      // Performance features
      averageResponseTime: business.performance?.averageResponseTime || 0,
      p95ResponseTime: business.performance?.p95ResponseTime || 0,
      p99ResponseTime: business.performance?.p99ResponseTime || 0,
      errorRate: this.calculateErrorRate(business.performance),

      // Revenue features (if applicable)
      revenuePerUser: this.calculateRevenuePerUser(business),
      revenuePerRequest: this.calculateRevenuePerRequest(business),
      profitMargin: this.calculateProfitMargin(business)
    };
  }

  /**
   * Extract lag features
   */
  extractLagFeatures(data) {
    const timeSeries = this.extractTimeSeries(data);
    const lagFeatures = {};

    for (const lag of this.config.lagFeatures) {
      if (timeSeries.length > lag) {
        lagFeatures[`lag${lag}`] = timeSeries[timeSeries.length - 1 - lag];
        lagFeatures[`lag${lag}Diff`] = timeSeries[timeSeries.length - 1] - timeSeries[timeSeries.length - 1 - lag];
        lagFeatures[`lag${lag}PctChange`] = this.calculatePercentageChange(
          timeSeries[timeSeries.length - 1 - lag],
          timeSeries[timeSeries.length - 1]
        );
      }
    }

    return lagFeatures;
  }

  /**
   * Extract rolling window features
   */
  extractRollingFeatures(data) {
    const timeSeries = this.extractTimeSeries(data);
    const rollingFeatures = {};

    for (const window of this.config.rollingWindows) {
      if (timeSeries.length >= window) {
        const windowData = timeSeries.slice(-window);
        const prefix = `rolling${window}`;

        rollingFeatures[`${prefix}Mean`] = this.calculateMean(windowData);
        rollingFeatures[`${prefix}Std`] = this.calculateStandardDeviation(windowData);
        rollingFeatures[`${prefix}Min`] = Math.min(...windowData);
        rollingFeatures[`${prefix}Max`] = Math.max(...windowData);
        rollingFeatures[`${prefix}Range`] = Math.max(...windowData) - Math.min(...windowData);
        rollingFeatures[`${prefix}Median`] = this.calculateMedian(windowData);
        rollingFeatures[`${prefix}Sum`] = windowData.reduce((sum, val) => sum + val, 0);

        // Percentiles
        for (const pct of [25, 75, 90, 95]) {
          rollingFeatures[`${prefix}P${pct}`] = this.calculatePercentile(windowData, pct);
        }

        // Trend within window
        rollingFeatures[`${prefix}Trend`] = this.calculateTrend(windowData);
      }
    }

    return rollingFeatures;
  }

  /**
   * Extract interaction features
   */
  extractInteractionFeatures(data) {
    const features = {};
    const numericalFeatures = this.getAllNumericalFeatures(data);

    // Feature interactions (pairwise products)
    const keys = Object.keys(numericalFeatures);
    for (let i = 0; i < Math.min(keys.length, 10); i++) {
      for (let j = i + 1; j < Math.min(keys.length, 10); j++) {
        const key1 = keys[i];
        const key2 = keys[j];
        features[`${key1}_x_${key2}`] = numericalFeatures[key1] * numericalFeatures[key2];
      }
    }

    // Feature ratios
    if (numericalFeatures.totalCost && numericalFeatures.totalRequests) {
      features.costPerRequestRatio = numericalFeatures.totalCost / numericalFeatures.totalRequests;
    }
    if (numericalFeatures.memoryUsage && numericalFeatures.cpuUsage) {
      features.memoryCpuRatio = numericalFeatures.memoryUsage / Math.max(numericalFeatures.cpuUsage, 0.1);
    }
    if (numericalFeatures.networkBytesReceived && numericalFeatures.networkBytesSent) {
      features.networkRatio = numericalFeatures.networkBytesReceived / Math.max(numericalFeatures.networkBytesSent, 1);
    }

    return features;
  }

  /**
   * Clean and validate features
   */
  cleanFeatures(features) {
    const cleaned = {};

    for (const [category, categoryFeatures] of Object.entries(features)) {
      cleaned[category] = {};

      for (const [key, value] of Object.entries(categoryFeatures)) {
        // Handle null/undefined
        if (value == null) {
          cleaned[category][key] = 0;
          continue;
        }

        // Handle infinity
        if (value === Infinity || value === -Infinity) {
          cleaned[category][key] = 0;
          continue;
        }

        // Handle NaN
        if (isNaN(value)) {
          cleaned[category][key] = 0;
          continue;
        }

        // Keep valid values
        cleaned[category][key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Count total features
   */
  countFeatures(features) {
    let count = 0;
    for (const category of Object.values(features)) {
      count += Object.keys(category).length;
    }
    return count;
  }

  // Helper methods
  extractNumericValues(data) {
    const values = [];

    if (data.invocations) values.push(data.invocations);
    if (data.averageExecutionTime) values.push(data.averageExecutionTime);
    if (data.memoryUsage) values.push(data.memoryUsage);
    if (data.errorRate) values.push(data.errorRate);
    if (data.totalRequests) values.push(data.totalRequests);
    if (data.averageResponseTime) values.push(data.averageResponseTime);
    if (data.cpuUsage) values.push(data.cpuUsage);

    return values;
  }

  extractTimeSeries(data) {
    // Extract time series data from metrics
    return data.timeSeries || data.values || [];
  }

  getAllNumericalFeatures(data) {
    const numerical = {};

    // Flatten nested objects and extract numerical values
    const extractNumerical = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}_${key}` : key;

        if (typeof value === 'number' && !isNaN(value)) {
          numerical[fullKey] = value;
        } else if (typeof value === 'object' && value !== null) {
          extractNumerical(value, fullKey);
        }
      }
    };

    extractNumerical(data);
    return numerical;
  }

  isHoliday(timestamp) {
    // Simple holiday detection (can be enhanced)
    const holidays = [
      '01-01', // New Year
      '07-04', // Independence Day
      '12-25', // Christmas
    ];

    const monthDay = `${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
    return holidays.includes(monthDay);
  }

  isPayday(timestamp) {
    // Assume 1st and 15th are paydays
    return timestamp.getDate() === 1 || timestamp.getDate() === 15;
  }

  detectDailySeasonality(timeSeries) {
    // Calculate autocorrelation at lag 24
    const n = timeSeries.length;
    if (n < 48) return 0;

    const mean = this.calculateMean(timeSeries);
    let numerator = 0;
    let denominator = 0;

    for (let i = 24; i < n; i++) {
      numerator += (timeSeries[i] - mean) * (timeSeries[i - 24] - mean);
      denominator += Math.pow(timeSeries[i] - mean, 2);
    }

    return denominator > 0 ? Math.abs(numerator / denominator) : 0;
  }

  detectWeeklySeasonality(timeSeries) {
    // Calculate autocorrelation at lag 168 (24*7)
    const n = timeSeries.length;
    if (n < 336) return 0;

    const mean = this.calculateMean(timeSeries);
    let numerator = 0;
    let denominator = 0;

    for (let i = 168; i < n; i++) {
      numerator += (timeSeries[i] - mean) * (timeSeries[i - 168] - mean);
      denominator += Math.pow(timeSeries[i] - mean, 2);
    }

    return denominator > 0 ? Math.abs(numerator / denominator) : 0;
  }

  findPeakHour(timeSeries) {
    // Find hour with highest average value
    const hourlyValues = {};
    const hourlyCounts = {};

    timeSeries.forEach((value, i) => {
      const hour = i % 24;
      hourlyValues[hour] = (hourlyValues[hour] || 0) + value;
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    let maxAvg = -Infinity;
    let peakHour = 0;

    for (let hour = 0; hour < 24; hour++) {
      if (hourlyCounts[hour]) {
        const avg = hourlyValues[hour] / hourlyCounts[hour];
        if (avg > maxAvg) {
          maxAvg = avg;
          peakHour = hour;
        }
      }
    }

    return peakHour;
  }

  findPeakDay(timeSeries) {
    // Find day with highest average value
    const dailyValues = {};
    const dailyCounts = {};

    timeSeries.forEach((value, i) => {
      const day = Math.floor(i / 24) % 7;
      dailyValues[day] = (dailyValues[day] || 0) + value;
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    let maxAvg = -Infinity;
    let peakDay = 0;

    for (let day = 0; day < 7; day++) {
      if (dailyCounts[day]) {
        const avg = dailyValues[day] / dailyCounts[day];
        if (avg > maxAvg) {
          maxAvg = avg;
          peakDay = day;
        }
      }
    }

    return peakDay;
  }

  getMostFrequent(arr) {
    const counts = {};
    arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;
  }

  calculateDiversity(arr) {
    return new Set(arr).size / Math.max(arr.length, 1);
  }

  calculateEntropy(arr) {
    const counts = {};
    arr.forEach(val => counts[val] = (counts[val] || 0) + 1);

    let entropy = 0;
    const total = arr.length;

    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  sentimentToScore(sentiment) {
    const scores = {
      positive: 1,
      neutral: 0,
      negative: -1
    };
    return scores[sentiment] || 0;
  }

  calculateRate(arr) {
    if (arr.length === 0) return 0;
    const trueCount = arr.filter(v => v === true || v === 1).length;
    return trueCount / arr.length;
  }

  calculateCostPerRequest(business) {
    const cost = business.costs?.totalCost || 0;
    const requests = business.usage?.totalRequests || 1;
    return cost / requests;
  }

  calculateCostPerUser(business) {
    const cost = business.costs?.totalCost || 0;
    const users = business.usage?.dailyActiveUsers || 1;
    return cost / users;
  }

  calculateGrowthRate(currentValue) {
    // Simple growth rate (can be enhanced with historical data)
    return 0; // Placeholder
  }

  calculateErrorRate(performance) {
    const errors = performance?.totalErrors || 0;
    const requests = performance?.totalRequests || 1;
    return errors / requests;
  }

  calculateRevenuePerUser(business) {
    // Placeholder - implement when revenue data is available
    return 0;
  }

  calculateRevenuePerRequest(business) {
    // Placeholder - implement when revenue data is available
    return 0;
  }

  calculateProfitMargin(business) {
    // Placeholder - implement when revenue data is available
    return 0;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    return (values[values.length - 1] - values[0]) / values.length;
  }

  calculatePercentageChange(from, to) {
    if (from === 0) return 0;
    return ((to - from) / Math.abs(from)) * 100;
  }

  // Statistical calculation methods
  calculateMean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateMode(arr) {
    if (arr.length === 0) return 0;
    const counts = {};
    arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
    return Number(Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0]);
  }

  calculateGeometricMean(arr) {
    if (arr.length === 0 || arr.some(v => v <= 0)) return 0;
    const product = arr.reduce((prod, val) => prod * val, 1);
    return Math.pow(product, 1 / arr.length);
  }

  calculateHarmonicMean(arr) {
    if (arr.length === 0 || arr.some(v => v === 0)) return 0;
    const sumReciprocal = arr.reduce((sum, val) => sum + 1 / val, 0);
    return arr.length / sumReciprocal;
  }

  calculateVariance(arr) {
    if (arr.length === 0) return 0;
    const mean = this.calculateMean(arr);
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  calculateStandardDeviation(arr) {
    return Math.sqrt(this.calculateVariance(arr));
  }

  calculateCoefficientOfVariation(arr) {
    const mean = this.calculateMean(arr);
    if (mean === 0) return 0;
    return this.calculateStandardDeviation(arr) / mean;
  }

  calculateInterquartileRange(arr) {
    const q25 = this.calculatePercentile(arr, 25);
    const q75 = this.calculatePercentile(arr, 75);
    return q75 - q25;
  }

  calculateSkewness(arr) {
    if (arr.length < 3) return 0;
    const mean = this.calculateMean(arr);
    const std = this.calculateStandardDeviation(arr);
    if (std === 0) return 0;

    const n = arr.length;
    const skew = arr.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0);
    return (n / ((n - 1) * (n - 2))) * skew;
  }

  calculateKurtosis(arr) {
    if (arr.length < 4) return 0;
    const mean = this.calculateMean(arr);
    const std = this.calculateStandardDeviation(arr);
    if (std === 0) return 0;

    const n = arr.length;
    const kurt = arr.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurt - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  getDefaultStatisticalFeatures() {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      geometricMean: 0,
      harmonicMean: 0,
      variance: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      range: 0,
      interquartileRange: 0,
      skewness: 0,
      kurtosis: 0,
      min: 0,
      max: 0,
      p10: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      count: 0,
      sum: 0,
      product: 0
    };
  }
}

module.exports = { FeatureExtractor };
