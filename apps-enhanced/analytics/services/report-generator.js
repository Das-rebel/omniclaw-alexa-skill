/**
 * Analytics Report Generator
 * Generates daily, weekly, and monthly reports
 *
 * @module apps/analytics/services/report-generator
 * @version 1.0.0
 */

const AnalyticsService = require('./analytics-service');

class ReportGenerator {
  constructor(options = {}) {
    this.analytics = new AnalyticsService(options);
  }

  /**
   * Generate daily report
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {object} - Complete daily report
   */
  async generateDailyReport(date = new Date().toISOString().split('T')[0]) {
    const report = await this.analytics.generateDailyReport(date);

    // Add insights and recommendations
    report.insights = await this._generateInsights(report);
    report.recommendations = await this._generateRecommendations(report);

    return report;
  }

  /**
   * Generate weekly report
   * @param {string} startDate - Start date (default: 7 days ago)
   * @param {string} endDate - End date (default: today)
   * @returns {object} - Weekly report
   */
  async generateWeeklyReport(
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0]
  ) {
    const metrics = await this.analytics.getMetricsSummary(startDate, endDate);
    const costs = await this.analytics.getCostBreakdown(startDate, endDate);

    const report = {
      type: 'weekly',
      dateRange: { startDate, endDate },
      metrics,
      costs,
      generatedAt: new Date().toISOString(),
    };

    report.insights = await this._generateInsights(report);
    report.recommendations = await this._generateRecommendations(report);

    return report;
  }

  /**
   * Generate monthly report
   * @param {string} month - Month in YYYY-MM format
   * @returns {object} - Monthly report
   */
  async generateMonthlyReport(month = new Date().toISOString().slice(0, 7)) {
    const startDate = `${month}-01`;
    const endDate = new Date(
      new Date(month + '-01').getFullYear(),
      new Date(month + '-01').getMonth() + 1,
      0
    ).toISOString().split('T')[0];

    const metrics = await this.analytics.getMetricsSummary(startDate, endDate);
    const costs = await this.analytics.getCostBreakdown(startDate, endDate);

    const report = {
      type: 'monthly',
      month,
      dateRange: { startDate, endDate },
      metrics,
      costs,
      generatedAt: new Date().toISOString(),
    };

    report.insights = await this._generateInsights(report);
    report.recommendations = await this._generateRecommendations(report);

    return report;
  }

  /**
   * Generate insights from report data
   * @private
   */
  async _generateInsights(report) {
    const insights = [];

    // Usage insights
    const totalRequests = report.metrics.totalRequests || 0;
    if (totalRequests > 1000) {
      insights.push({
        type: 'usage',
        level: 'info',
        message: `High usage detected: ${totalRequests.toLocaleString()} requests in period`,
      });
    }

    // Feature insights
    const features = report.metrics.featureUsage || {};
    const topFeature = Object.entries(features).sort((a, b) => b[1] - a[1])[0];
    if (topFeature) {
      insights.push({
        type: 'feature',
        level: 'success',
        message: `Most used feature: ${topFeature[0]} with ${topFeature[1]} requests`,
      });
    }

    // Performance insights
    if (report.performance) {
      const avgLatency = report.performance.latency?.avg || 0;
      if (avgLatency > 1000) {
        insights.push({
          type: 'performance',
          level: 'warning',
          message: `High average latency: ${avgLatency.toFixed(0)}ms (target: <500ms)`,
        });
      } else if (avgLatency < 300) {
        insights.push({
          type: 'performance',
          level: 'success',
          message: `Excellent performance: ${avgLatency.toFixed(0)}ms average latency`,
        });
      }

      const successRate = report.performance.successRate || 0;
      if (successRate < 0.99) {
        insights.push({
          type: 'reliability',
          level: 'warning',
          message: `Success rate below target: ${(successRate * 100).toFixed(1)}% (target: >99%)`,
        });
      }
    }

    // Cost insights
    const totalCost = report.costs?.totalCost || 0;
    if (totalCost > 50) {
      insights.push({
        type: 'cost',
        level: 'warning',
        message: `High cost detected: $${totalCost.toFixed(2)} for period`,
      });
    }

    return insights;
  }

  /**
   * Generate recommendations from report data
   * @private
   */
  async _generateRecommendations(report) {
    const recommendations = [];

    // Performance recommendations
    if (report.performance) {
      const avgLatency = report.performance.latency?.avg || 0;
      if (avgLatency > 500) {
        recommendations.push({
          priority: 'high',
          category: 'performance',
          title: 'Optimize Response Times',
          description: 'Consider implementing caching or optimizing database queries to reduce latency.',
        });
      }
    }

    // Cost recommendations
    const costs = report.costs?.byProvider || {};
    const glmCost = costs.glm || 0;
    const groqCost = costs.groq || 0;

    if (glmCost > groqCost * 3) {
      recommendations.push({
        priority: 'medium',
        category: 'cost',
        title: 'Optimize LLM Provider Selection',
        description: 'Consider routing more simple queries to Groq (free tier) to reduce costs.',
      });
    }

    // Feature recommendations
    const features = report.metrics.featureUsage || {};
    if (!features.email || features.email < 10) {
      recommendations.push({
        priority: 'low',
        category: 'feature',
        title: 'Promote Email Features',
        description: 'Email intelligence has low usage. Consider promoting this feature to users.',
      });
    }

    return recommendations;
  }

  /**
   * Send report via email
   * @param {object} report - Report to send
   * @param {string} recipient - Email recipient
   */
  async sendReportEmail(report, recipient) {
    // Implementation would use email service
    console.log(`Sending ${report.type} report to ${recipient}`);
    // TODO: Implement email sending
  }

  /**
   * Generate and schedule daily reports
   */
  async scheduleDailyReports(time = '09:00') {
    // Implementation would use Cloud Scheduler
    console.log(`Scheduling daily reports for ${time}`);
    // TODO: Implement scheduler integration
  }
}

module.exports = ReportGenerator;
