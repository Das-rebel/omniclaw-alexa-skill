/**
 * Redis Streams Configuration for Price Tracking
 *
 * Implements event-driven architecture using Redis Streams:
 * - price-checks: Incoming scrape requests
 * - price-data: Raw price data from scrapers
 * - price-alerts: Generated alerts for notifications
 * - price-history: Historical data for analytics
 */

const { REDIS_HOST = 'localhost', REDIS_PORT = 6379, REDIS_PASSWORD } = process.env;

module.exports = {
  // Redis connection
  connection: {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
    password: REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
  },

  // Stream definitions
  streams: {
    // Incoming price check requests
    'price-checks': {
      description: 'Queue of products to check',
      maxLength: 10000,
      approx: true
    },

    // Raw price data from scrapers
    'price-data': {
      description: 'Raw scraped price data',
      maxLength: 50000,
      approx: true
    },

    // Generated alerts
    'price-alerts': {
      description: 'Price drop and deal alerts',
      maxLength: 10000,
      approx: true
    },

    // Historical data
    'price-history': {
      description: 'Historical price tracking data',
      maxLength: 100000,
      approx: true
    }
  },

  // Consumer groups
  consumerGroups: {
    // Analyzers: Process raw price data, detect trends
    'price-data': {
      'analyzers': {
        description: 'Price analysis and trend detection',
        startId: '0'
      }
    },

    // Notifiers: Send alerts via various channels
    'price-alerts': {
      'notifiers': {
        description: 'Send notifications to users',
        startId: '0'
      }
    },

    // Historians: Archive price data
    'price-history': {
      'historians': {
        description: 'Store historical price data',
        startId: '0'
      }
    }
  },

  // Message structure definitions
  messageSchemas: {
    priceCheck: {
      url: 'string',
      productId: 'string',
      platform: 'string',
      userId: 'string',
      priority: 'number', // 1-10, 10 = highest
      checkInterval: 'number', // milliseconds
      thresholds: {
        targetPrice: 'number',
        percentageDrop: 'number',
        allTimeLow: 'boolean'
      }
    },

    priceData: {
      productId: 'string',
      url: 'string',
      platform: 'string',
      timestamp: 'number',
      price: 'number',
      currency: 'string',
      availability: 'boolean',
      title: 'string',
      metadata: {
        rating: 'number',
        reviewCount: 'number',
        lightningDeal: 'boolean',
        prime: 'boolean',
        discount: 'number',
        originalPrice: 'number'
      }
    },

    priceAlert: {
      alertId: 'string',
      productId: 'string',
      userId: 'string',
      type: 'string', // 'price_drop', 'all_time_low', 'lightning_deal', 'target_reached'
      severity: 'string', // 'info', 'warning', 'critical'
      timestamp: 'number',
      data: {
        currentPrice: 'number',
        previousPrice: 'number',
        percentageDrop: 'number',
        targetPrice: 'number',
        allTimeLow: 'boolean',
        url: 'string',
        title: 'string'
      },
      channels: ['string'] // ['alexa', 'fcm', 'email']
    },

    priceHistory: {
      productId: 'string',
      platform: 'string',
      timestamp: 'number',
      price: 'number',
      availability: 'boolean',
      metadata: 'object'
    }
  },

  // Consumer configuration
  consumers: {
    // Price Analyzer Service
    analyzer: {
      stream: 'price-data',
      consumerGroup: 'analyzers',
      consumerName: 'analyzer-1',
      count: 10, // Messages per batch
      blockTime: 5000, // 5 seconds
      processTimeout: 30000 // 30 seconds per message
    },

    // Alert Evaluator Service
    alertEvaluator: {
      stream: 'price-data',
      consumerGroup: 'analyzers',
      consumerName: 'alert-evaluator-1',
      count: 5,
      blockTime: 5000,
      processTimeout: 15000
    },

    // Notification Service
    notifier: {
      stream: 'price-alerts',
      consumerGroup: 'notifiers',
      consumerName: 'notifier-1',
      count: 10,
      blockTime: 5000,
      processTimeout: 10000
    },

    // History Recorder Service
    historian: {
      stream: 'price-history',
      consumerGroup: 'historians',
      consumerName: 'historian-1',
      count: 50, // Batch process
      blockTime: 5000,
      processTimeout: 60000
    }
  },

  // Retention policies (TTL in seconds)
  retention: {
    'price-checks': 86400, // 1 day
    'price-data': 604800, // 7 days
    'price-alerts': 2592000, // 30 days
    'price-history': 63072000 // 2 years
  },

  // Priority queues
  priorities: {
    critical: 10, // Lightning deals, all-time lows
    high: 7, // Target price reached
    normal: 5, // Regular checks
    low: 3 // Historical monitoring
  },

  // Rate limiting per consumer
  rateLimits: {
    analyzer: 100, // messages per minute
    alertEvaluator: 50,
    notifier: 200,
    historian: 500
  }
};
