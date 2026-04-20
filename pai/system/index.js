/**
 * PAI Control Plane Integration for Node.js Cloud Functions
 * Bridges PAI control plane with OmniClaw infrastructure
 */

const path = require('path');
const { hookBus, HOOK_NAMES } = require('./hooks/hook_bus');
const { loadTeler } = require('./telos/loader');
const { isPaiEnabled, isFeatureEnabled } = require('./feature_flags');

/**
 * Initialize PAI control plane
 * @param {Object} options - Initialization options
 * @returns {Object} PAI integration object
 */
function initializePai(options = {}) {
  const {
    enabled = isPaiEnabled(),
    loadTelos = true,
    registerHooks = true,
    registerLogging = false
  } = options;

  if (!enabled) {
    console.log('PAI Control Plane: disabled via feature flag');
    return {
      enabled: false,
      telos: null,
      hooks: null
    };
  }

  console.log('PAI Control Plane: initializing...');

  // Load TELOS if enabled
  let telos = null;
  if (loadTelos && isFeatureEnabled('telos')) {
    const telosPath = path.join(__dirname, 'telos');
    telos = loadTeler({ basePath: telosPath });
    console.log('PAI Control Plane: TELOS loaded');
  }

  // Register hooks if enabled
  if (registerHooks && isFeatureEnabled('hooks')) {
    // Import logging subscriber
    if (registerLogging && isFeatureEnabled('logging')) {
      const { registerLogging: registerLoggingSubscriber } = require('./hooks/subscribers/logging');
      registerLoggingSubscriber(hookBus);
      console.log('PAI Control Plane: logging subscriber registered');
    }

    // Import metrics subscriber
    if (isFeatureEnabled('metrics')) {
      const { registerMetrics } = require('./hooks/subscribers/metrics');
      registerMetrics(hookBus);
      console.log('PAI Control Plane: metrics subscriber registered');
    }

    console.log(`PAI Control Plane: ${HOOK_NAMES.length} hooks available`);
  }

  return {
    enabled: true,
    telos,
    hooks: hookBus,
    emit: hookBus.emit.bind(hookBus),
    isFeatureEnabled
  };
}

/**
 * PAI middleware for Express/Cloud Functions
 * Adds PAI context to request/response
 */
function paiMiddleware(req, res, next) {
  if (!isPaiEnabled()) {
    return next();
  }

  // Add PAI context to request
  req.pai = {
    enabled: true,
    telos: isFeatureEnabled('telos') ? loadTeler() : null,
    emit: hookBus.emit.bind(hookBus)
  };

  // Emit on_message hook
  if (isFeatureEnabled('hooks')) {
    hookBus.message({
      type: req.method,
      path: req.path,
      body: req.body
    }).catch(err => {
      console.error('Hook emit error:', err.message);
    });
  }

  // Emit on_start for new sessions
  if (!req.session?.initialized) {
    hookBus.start({ sessionId: req.sessionID }).catch(err => {
      console.error('Hook emit error:', err.message);
    });
    req.session = req.session || {};
    req.session.initialized = true;
  }

  next();
}

module.exports = {
  initializePai,
  paiMiddleware,
  hookBus,
  HOOK_NAMES
};
