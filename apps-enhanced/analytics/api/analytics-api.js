/**
 * Analytics API Endpoints
 * HTTP endpoints for analytics dashboard and reports
 *
 * @module apps/analytics/api/analytics-api
 * @version 1.0.0
 */

const express = require('express');
const AnalyticsService = require('../services/analytics-service');
const { analyticsMiddleware } = require('../middleware/analytics-middleware');

const router = express.Router();
const analytics = new AnalyticsService();

/**
 * GET /api/analytics/dashboard
 * Get dashboard data
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await analytics.getDashboardData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/metrics
 * Get metrics summary for date range
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }

    const metrics = await analytics.getMetricsSummary(startDate, endDate);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/performance/:function
 * Get performance metrics for a function
 */
router.get('/performance/:function', async (req, res, next) => {
  try {
    const { function: functionName } = req.params;
    const { date } = req.query;

    const performance = await analytics.getPerformanceMetrics(functionName, date);
    res.json(performance);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/costs
 * Get cost breakdown
 */
router.get('/costs', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }

    const costs = await analytics.getCostBreakdown(startDate, endDate);
    res.json(costs);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analytics/reports/generate
 * Generate a report
 */
router.post('/reports/generate', async (req, res, next) => {
  try {
    const { date, type = 'daily' } = req.body;

    let report;
    if (type === 'daily') {
      report = await analytics.generateDailyReport(date);
    } else {
      return res.status(400).json({ error: 'Unsupported report type' });
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/reports/:date
 * Get a report for a specific date
 */
router.get('/reports/:date', async (req, res, next) => {
  try {
    const { date } = req.params;

    const doc = await analytics.firestore
      .collection(analytics.collections.reports)
      .doc(`daily_${date}`)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(doc.data());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analytics/cleanup
 * Clean up old data
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const { daysToKeep = 7 } = req.body;

    const deleted = await analytics.cleanup(daysToKeep);

    res.json({
      success: true,
      message: `Cleaned up data older than ${daysToKeep} days`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/health
 * Health check for analytics service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Serve dashboard HTML
 */
router.get('/dashboard-ui', (req, res) => {
  res.sendFile('/index.html', { root: `${__dirname}/../dashboard` });
});

module.exports = router;
