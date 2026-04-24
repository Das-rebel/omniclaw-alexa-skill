/**
 * Analytics Middleware
 * Express middleware for automatic request tracking
 *
 * @module apps/analytics/middleware/analytics-middleware
 * @version 1.0.0
 */

const AnalyticsService = require('../services/analytics-service');

let analyticsInstance = null;

/**
 * Get analytics service instance
 */
function getAnalyticsService() {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsService();
  }
  return analyticsInstance;
}

/**
 * Analytics middleware for Express
 * Automatically tracks all HTTP requests
 */
function analyticsMiddleware(options = {}) {
  const analytics = getAnalyticsService();

  return async (req, res, next) => {
    const startTime = Date.now();

    // Extract request metadata
    const metadata = {
      function: options.functionName || 'unknown',
      endpoint: req.path,
      method: req.method,
      userId: req.user?.id || req.session?.userId || null,
      sessionId: req.session?.id || null,
      queryType: null, // Will be set by route handlers
      provider: null, // Will be set by route handlers
    };

    // Attach analytics to request for manual tracking
    req.analytics = {
      analytics,
      metadata,
      trackFeature: (feature, action, data) => {
        analytics.trackFeatureUse(feature, action, {
          ...metadata,
          ...data,
        });
      },
      trackError: (error, context) => {
        analytics.trackError(error, {
          ...metadata,
          ...context,
        });
      },
      setQueryType: (queryType) => {
        metadata.queryType = queryType;
      },
      setProvider: (provider) => {
        metadata.provider = provider;
      },
    };

    // Track response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const latency = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Track the request
      analytics.trackRequest({
        ...metadata,
        latency,
        success,
        errorCode: success ? null : res.statusCode,
        tokensUsed: data.tokensUsed || 0,
        cost: data.cost || 0,
      });

      return originalJson(data);
    };

    next();
  };
}

/**
 * Route-specific middleware for feature tracking
 */
function trackFeature(feature, action) {
  return (req, res, next) => {
    if (req.analytics) {
      req.analytics.trackFeature(feature, action, {
        body: req.body ? JSON.stringify(req.body).substring(0, 1000) : null,
      });
    }
    next();
  };
}

/**
 * Error tracking middleware
 */
function errorTrackingMiddleware() {
  return (err, req, res, next) => {
    if (req.analytics) {
      req.analytics.trackError(err, {
        endpoint: req.path,
        method: req.method,
        body: req.body ? JSON.stringify(req.body).substring(0, 1000) : null,
      });
    }
    next(err);
  };
}

/**
 * Feature-specific middleware generators
 */
const emailMiddleware = {
  read: trackFeature('email', 'read'),
  draft: trackFeature('email', 'draft'),
  send: trackFeature('email', 'send'),
  search: trackFeature('email', 'search'),
};

const priceMiddleware = {
  add: trackFeature('price', 'add'),
  check: trackFeature('price', 'check'),
  alert: trackFeature('price', 'alert'),
  history: trackFeature('price', 'history'),
};

const mediaMiddleware = {
  play: trackFeature('media', 'play'),
  pause: trackFeature('media', 'pause'),
  search: trackFeature('media', 'search'),
  control: trackFeature('media', 'control'),
};

const storyMiddleware = {
  generate: trackFeature('story', 'generate'),
  play: trackFeature('story', 'play'),
  pause: trackFeature('story', 'pause'),
  choose: trackFeature('story', 'choose'),
};

/**
 * HALO analytics helper
 */
function trackHALOQuery(queryType, provider, latency, success) {
  const analytics = getAnalyticsService();
  analytics.trackEvent('halo_query', {
    queryType,
    provider,
    latency,
    success,
  });
}

module.exports = {
  analyticsMiddleware,
  trackFeature,
  errorTrackingMiddleware,
  emailMiddleware,
  priceMiddleware,
  mediaMiddleware,
  storyMiddleware,
  trackHALOQuery,
  getAnalyticsService,
};
