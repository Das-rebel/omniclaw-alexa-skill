/**
 * OmniClaw Enhanced - Health Check Function
 * Provides health status for all services
 *
 * @module infrastructure/cloud-functions/health
 * @version 2.0.0
 */

const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
  projectId: process.env.PROJECT_ID || 'omniclaw-enhanced',
});

/**
 * Health check handler
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 */
exports.healthHandler = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const path = req.path;

  // Main health endpoint
  if (path === '/health' || path === '/') {
    try {
      // Test Firestore connection
      const testDoc = await firestore.collection('health').doc('test').get();

      const health = {
        status: 'healthy',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        project: process.env.PROJECT_ID || 'omniclaw-enhanced',
        region: process.env.REGION || 'us-central1',
        environment: process.env.ENVIRONMENT || 'production',
        services: {
          firestore: 'connected',
          api: 'operational',
        },
        features: {
          haloOrchestration: process.env.ENABLE_HALO_ORCHESTRATION === 'true',
          analytics: process.env.ENABLE_ANALYTICS === 'true',
          tracing: process.env.ENABLE_TRACING === 'true',
        },
      };

      res.status(200).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    return;
  }

  // Readiness probe
  if (path === '/ready') {
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Liveness probe
  if (path === '/alive') {
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 404 for unknown paths
  res.status(404).json({
    error: 'Not found',
    available: ['/health', '/ready', '/alive'],
  });
};
