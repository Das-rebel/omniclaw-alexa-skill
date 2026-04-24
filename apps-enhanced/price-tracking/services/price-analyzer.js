/**
 * Price Analyzer Service
 *
 * Analyzes price changes, detects trends, and identifies significant price movements:
 * - Historical price tracking (2 years)
 * - Multi-platform price comparison
 * - Price change detection with configurable thresholds
 * - Stock availability tracking
 * - Trend analysis and forecasting
 * - Price history aggregation
 */

const { Redis } = require('@upstash/redis');
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('PriceAnalyzer');

class PriceAnalyzer {
  constructor(config = {}) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.config = {
      historyDuration: 2 * 365 * 24 * 60 * 60, // 2 years in seconds
      significantChangeThreshold: 5, // 5% change is significant
      trendAnalysisWindow: 30, // 30 days for trend analysis
      maxHistoryPoints: 1000, // Max history points per product
      ...config
    };
  }

  /**
   * Analyze price data and detect changes
   */
  async analyzePrice(productData) {
    try {
      const {
        productId,
        platform,
        price,
        currency,
        availability,
        metadata
      } = productData;

      // Get historical data
      const history = await this.getPriceHistory(productId, platform);
      const previousPrice = history.length > 0 ? history[0].price : null;

      // Calculate price change
      const priceChange = this.calculatePriceChange(previousPrice, price);

      // Detect significant change
      const isSignificant = Math.abs(priceChange?.percentChange || 0) >=
        this.config.significantChangeThreshold;

      // Analyze trend
      const trend = await this.analyzeTrend(productId, platform);

      // Compare across platforms
      const platformComparison = await this.compareAcrossPlatforms(productId);

      // Check availability change
      const availabilityChange = this.checkAvailabilityChange(
        history.length > 0 ? history[0].availability : null,
        availability
      );

      const analysis = {
        productId,
        platform,
        currentPrice: price,
        previousPrice,
        priceChange,
        isSignificant,
        trend,
        platformComparison,
        availability,
        availabilityChange,
        currency,
        metadata,
        timestamp: Date.now()
      };

      // Store price data point
      await this.storePriceDataPoint(productId, platform, productData);

      logger.info(`Analyzed price for ${productId}: ${priceChange?.percentChange || 0}% change`);
      return analysis;

    } catch (error) {
      logger.error('Failed to analyze price:', error);
      throw error;
    }
  }

  /**
   * Store price data point in Redis
   */
  async storePriceDataPoint(productId, platform, productData) {
    try {
      const key = `price:${platform}:${productId}`;
      const dataPoint = {
        price: productData.price,
        currency: productData.currency,
        availability: productData.availability,
        metadata: productData.metadata,
        timestamp: Date.now()
      };

      // Add to sorted set (score = timestamp)
      await this.redis.zadd(key, {
        score: dataPoint.timestamp,
        member: JSON.stringify(dataPoint)
      });

      // Trim to max history points
      await this.redis.zremrangebyrank(
        key,
        0,
        -(this.config.maxHistoryPoints + 1)
      );

      // Update latest price cache
      await this.redis.set(
        `price:latest:${platform}:${productId}`,
        JSON.stringify(dataPoint),
        { ex: this.config.historyDuration }
      );

      logger.debug(`Stored price data point for ${productId} on ${platform}`);
    } catch (error) {
      logger.error('Failed to store price data point:', error);
    }
  }

  /**
   * Get price history for product
   */
  async getPriceHistory(productId, platform, duration = null) {
    try {
      const key = `price:${platform}:${productId}`;
      const maxAge = duration || this.config.historyDuration;
      const minTimestamp = Date.now() - (maxAge * 1000);

      // Get all data points within time range
      const dataPoints = await this.redis.zrangebyscore(
        key,
        minTimestamp,
        '+inf',
        {
          rev: true, // Descending order (newest first)
          count: this.config.maxHistoryPoints
        }
      );

      return dataPoints.map(point => JSON.parse(point));
    } catch (error) {
      logger.error('Failed to get price history:', error);
      return [];
    }
  }

  /**
   * Calculate price change
   */
  calculatePriceChange(previousPrice, currentPrice) {
    if (!previousPrice || !currentPrice) {
      return null;
    }

    const absoluteChange = currentPrice - previousPrice;
    const percentChange = (absoluteChange / previousPrice) * 100;

    return {
      absolute: absoluteChange,
      percent: percentChange,
      direction: absoluteChange > 0 ? 'increase' :
                 absoluteChange < 0 ? 'decrease' : 'no_change'
    };
  }

  /**
   * Analyze price trend
   */
  async analyzeTrend(productId, platform) {
    try {
      const history = await this.getPriceHistory(
        productId,
        platform,
        this.config.trendAnalysisWindow * 24 * 60 * 60 // Convert days to seconds
      );

      if (history.length < 2) {
        return { trend: 'insufficient_data' };
      }

      // Calculate moving averages
      const prices = history.map(h => h.price);
      const avg7Days = this.calculateMovingAverage(prices.slice(0, 7));
      const avg30Days = this.calculateMovingAverage(prices);

      // Detect trend direction
      let trend = 'stable';
      if (avg7Days > avg30Days * 1.05) {
        trend = 'rising';
      } else if (avg7Days < avg30Days * 0.95) {
        trend = 'falling';
      }

      // Calculate volatility
      const volatility = this.calculateVolatility(prices);

      // Find min/max prices
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const currentPrice = prices[0];

      return {
        trend,
        avg7Days,
        avg30Days,
        volatility,
        minPrice,
        maxPrice,
        currentPrice,
        percentFromMin: ((currentPrice - minPrice) / minPrice) * 100,
        percentFromMax: ((currentPrice - maxPrice) / maxPrice) * 100,
        dataPoints: history.length
      };

    } catch (error) {
      logger.error('Failed to analyze trend:', error);
      return { trend: 'error' };
    }
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(prices) {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
  }

  /**
   * Calculate price volatility
   */
  calculateVolatility(prices) {
    if (prices.length < 2) return 0;

    const avg = this.calculateMovingAverage(prices);
    const squaredDiffs = prices.map(price => Math.pow(price - avg, 2));
    const variance = this.calculateMovingAverage(squaredDiffs);
    const stdDev = Math.sqrt(variance);

    return (stdDev / avg) * 100; // Coefficient of variation
  }

  /**
   * Compare prices across platforms
   */
  async compareAcrossPlatforms(productId) {
    try {
      const platforms = ['amazon', 'flipkart', 'myntra'];
      const comparisons = [];

      for (const platform of platforms) {
        const latest = await this.redis.get(`price:latest:${platform}:${productId}`);
        if (latest) {
          comparisons.push({
            platform,
            ...JSON.parse(latest)
          });
        }
      }

      if (comparisons.length < 2) {
        return { available: false, message: 'Need at least 2 platforms' };
      }

      // Sort by price
      comparisons.sort((a, b) => a.price - b.price);

      const lowest = comparisons[0];
      const highest = comparisons[comparisons.length - 1];
      const savings = highest.price - lowest.price;
      const savingsPercent = (savings / highest.price) * 100;

      return {
        available: true,
        platforms: comparisons,
        lowest: {
          platform: lowest.platform,
          price: lowest.price,
          url: lowest.metadata?.url
        },
        highest: {
          platform: highest.platform,
          price: highest.price
        },
        savings,
        savingsPercent,
        recommendation: savingsPercent > 10 ? 'buy_from_lowest' : 'price_similar'
      };

    } catch (error) {
      logger.error('Failed to compare across platforms:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Check availability change
   */
  checkAvailabilityChange(previousAvailability, currentAvailability) {
    if (!previousAvailability || !currentAvailability) {
      return null;
    }

    if (previousAvailability !== currentAvailability) {
      if (currentAvailability && !previousAvailability) {
        return 'now_available';
      } else if (!currentAvailability && previousAvailability) {
        return 'now_unavailable';
      }
    }

    return 'no_change';
  }

  /**
   * Get best price across all platforms
   */
  async getBestPrice(productId) {
    try {
      const comparison = await this.compareAcrossPlatforms(productId);

      if (!comparison.available) {
        return null;
      }

      return comparison.lowest;
    } catch (error) {
      logger.error('Failed to get best price:', error);
      return null;
    }
  }

  /**
   * Get price statistics for dashboard
   */
  async getPriceStatistics(productId, platform) {
    try {
      const history = await this.getPriceHistory(productId, platform);

      if (history.length === 0) {
        return null;
      }

      const prices = history.map(h => h.price);
      const currentPrice = prices[0];
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = this.calculateMovingAverage(prices);

      // Calculate percentile rankings
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const percentile25 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
      const percentile50 = sortedPrices[Math.floor(sortedPrices.length * 0.5)];
      const percentile75 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];

      return {
        current: currentPrice,
        min: minPrice,
        max: maxPrice,
        average: avgPrice,
        percentile25,
        median: percentile50,
        percentile75,
        percentFromMin: ((currentPrice - minPrice) / minPrice) * 100,
        percentFromMax: ((currentPrice - maxPrice) / maxPrice) * 100,
        dataPoints: history.length,
        oldestPrice: history[history.length - 1]?.price,
        newestPrice: currentPrice
      };

    } catch (error) {
      logger.error('Failed to get price statistics:', error);
      return null;
    }
  }

  /**
   * Detect price anomalies
   */
  async detectAnomalies(productId, platform, threshold = 2) {
    try {
      const history = await this.getPriceHistory(productId, platform);

      if (history.length < 10) {
        return { hasAnomaly: false, reason: 'insufficient_data' };
      }

      const prices = history.map(h => h.price);
      const avg = this.calculateMovingAverage(prices);
      const stdDev = Math.sqrt(
        this.calculateMovingAverage(prices.map(p => Math.pow(p - avg, 2)))
      );

      const currentPrice = prices[0];
      const zScore = Math.abs((currentPrice - avg) / stdDev);

      if (zScore > threshold) {
        return {
          hasAnomaly: true,
          type: currentPrice > avg ? 'spike' : 'drop',
          zScore,
          currentPrice,
          averagePrice: avg,
          deviationPercent: ((currentPrice - avg) / avg) * 100
        };
      }

      return { hasAnomaly: false, zScore };

    } catch (error) {
      logger.error('Failed to detect anomalies:', error);
      return { hasAnomaly: false, error: error.message };
    }
  }

  /**
   * Clear old price data
   */
  async clearOldData(productId = null, platform = null) {
    try {
      const cutoffTime = Date.now() - (this.config.historyDuration * 1000);

      if (productId && platform) {
        const key = `price:${platform}:${productId}`;
        await this.redis.zremrangebyscore(key, 0, cutoffTime);
        logger.info(`Cleared old data for ${productId} on ${platform}`);
      } else {
        // Clear all old data (scan all keys)
        const pattern = 'price:*:*';
        const keys = await this.redis.keys(pattern);

        for (const key of keys) {
          await this.redis.zremrangebyscore(key, 0, cutoffTime);
        }

        logger.info(`Cleared old data for all products`);
      }

    } catch (error) {
      logger.error('Failed to clear old data:', error);
    }
  }
}

module.exports = PriceAnalyzer;
