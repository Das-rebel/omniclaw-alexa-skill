/**
 * Health Check Endpoint for OmniClaw
 * Provides comprehensive system health status
 */

const { getHealthStatus } = require('../../shared/resilience/index');

/**
 * GET /health - System health check
 * Returns health status of all components
 */
exports.healthHandler = async (req, res) => {
  const startTime = Date.now();

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      region: process.env.GCP_REGION || 'asia-south1',
      responseTime: 0,
      components: {}
    };

    // Check circuit breakers
    try {
      const circuitHealth = getHealthStatus();
      health.components.circuitBreakers = circuitHealth.circuitBreakers;

      const openCircuits = circuitHealth.circuitBreakers.filter(cb => !cb.healthy);
      if (openCircuits.length > 0) {
        health.status = 'degraded';
        health.components.circuitBreakers.warning = `${openCircuits.length} circuits open`;
      }
    } catch (error) {
      health.components.circuitBreakers = {
        status: 'error',
        message: error.message
      };
      health.status = 'degraded';
    }

    // Check external services (sample)
    const servicesToCheck = [
      { name: 'firestore', check: checkFirestore },
      { name: 'redis', check: checkRedis },
      { name: 'cerebras', check: checkCerebras }
    ];

    for (const service of servicesToCheck) {
      try {
        const serviceHealth = await service.check();
        health.components[service.name] = {
          status: 'ok',
          responseTime: serviceHealth.responseTime
        };
      } catch (error) {
        health.components[service.name] = {
          status: 'error',
          message: error.message
        };
        health.status = 'degraded';
      }
    }

    // Calculate total response time
    health.responseTime = Date.now() - startTime;

    // Set HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /health/ready - Readiness probe (for K8s/GKE)
 */
exports.readyHandler = async (req, res) => {
  // Check if critical services are ready
  const ready = await Promise.all([
    checkFirestore().catch(() => false),
    checkRedis().catch(() => false)
  ]);

  if (ready.every(r => r === true)) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
};

/**
 * GET /health/live - Liveness probe (for K8s/GKE)
 */
exports.liveHandler = async (req, res) => {
  res.status(200).json({ status: 'alive' });
};

// Service check functions
async function checkFirestore() {
  const start = Date.now();
  // TODO: Actual Firestore ping
  await new Promise(resolve => setTimeout(resolve, 10));
  return { responseTime: Date.now() - start };
}

async function checkRedis() {
  const start = Date.now();
  // TODO: Actual Redis ping
  await new Promise(resolve => setTimeout(resolve, 10));
  return { responseTime: Date.now() - start };
}

async function checkCerebras() {
  const start = Date.now();
  // TODO: Actual Cerebras API ping
  await new Promise(resolve => setTimeout(resolve, 10));
  return { responseTime: Date.now() - start };
}
