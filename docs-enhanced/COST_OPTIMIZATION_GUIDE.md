# OmniClaw Enhanced - Cost Optimization Guide

Complete guide to optimizing cloud costs for OmniClaw Enhanced serverless infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [Cost Analysis](#cost-analysis)
3. [Optimization Strategies](#optimization-strategies)
4. [Budget Management](#budget-management)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

OmniClaw Enhanced runs on Google Cloud Platform serverless infrastructure, which offers automatic scaling and pay-per-use pricing. However, costs can still grow without proper monitoring and optimization.

This guide provides enterprise-grade strategies for monitoring, analyzing, and optimizing your cloud costs.

## Cost Analysis

### Understanding Your Costs

Before optimizing, you must understand where your money is going:

```bash
# Analyze costs by service
./cost-optimizer/cli/cost-cli.sh analyze --period 30d

# Generate comprehensive report
./cost-optimizer/cli/cost-cli.sh report --format html --output report.html

# View cost trends
./cost-optimizer/cli/cost-cli.sh trends --period 90d
```

### Key Metrics to Monitor

1. **Total Cost**: Overall cloud spending
2. **Cost Per Request**: Cost per function invocation
3. **Cost Per Function**: Individual function costs
4. **Cost By Region**: Geographic cost distribution
5. **Cost Trends**: Month-over-month changes

### Cost Breakdown

```bash
# View costs by service
node -e "
const { CostAnalyzer } = require('./cost-optimizer/cost-analyzer');
const analyzer = new CostAnalyzer();

(async () => {
  const byService = await analyzer.analyzeByService('30d');
  console.log('Top 5 Services:');
  byService.services.slice(0, 5).forEach(s => {
    console.log(\`  \${s.service}: $\${s.cost.toFixed(2)} (\${s.percentage}%)\`);
  });
})();
"
```

## Optimization Strategies

### 1. Rightsizing Cloud Functions

Rightsize functions to match actual resource usage:

```javascript
const { RightsizingAnalyzer } = require('./cost-optimizer/engine/rightsizing');

const analyzer = new RightsizingAnalyzer();
const recommendations = await analyzer.analyze('30d');

recommendations.recommendations.forEach(rec => {
  console.log(`Function: ${rec.functionName}`);
  console.log(`  Current: ${rec.changes.memory?.from}`);
  console.log(`  Recommended: ${rec.changes.memory?.to}`);
  console.log(`  Savings: ${rec.potentialSavings}`);
});
```

**Best Practices:**
- Start with 256MB memory for most functions
- Increase only if you see memory errors
- Monitor execution time trends
- Set timeout to 3x your p99 execution time

**Memory Guidelines:**
- Simple API handlers: 128-256MB
- Data processing: 256-512MB
- Machine learning inference: 512-2048MB
- Heavy computation: 1024-4096MB

### 2. Schedule-Based Scaling

Scale functions to zero during low-usage periods:

```bash
# Analyze scheduling opportunities
./cost-optimizer/cli/cost-cli.sh optimize | jq '.scheduling.opportunities[]'
```

**Implementation Steps:**

1. Identify low-usage periods
2. Create Cloud Scheduler jobs
3. Scale minInstances to 0 during off hours
4. Scale up during peak hours

**Example Schedule:**

```javascript
const schedules = [
  {
    function: 'omniclaw-price',
    timezone: 'America/New_York',
    scaleToZero: ['00:00-06:00'], // 12AM-6AM
    scaleUp: ['06:00-00:00']
  },
  {
    function: 'omniclaw-story',
    timezone: 'America/New_York',
    scaleToZero: ['22:00-06:00'], // 10PM-6AM
    scaleUp: ['06:00-22:00']
  }
];
```

### 3. Reserved Commitments

Purchase commitments for predictable workloads:

```bash
# Analyze commitment opportunities
./cost-optimizer/cli/cost-cli.sh optimize | jq '.reserved.commitments[]'
```

**When to Buy Commitments:**
- Consistent usage > 50% of commitment level
- Workload runs 24/7 or predictable schedule
- You can commit to 1-3 year term

**Commitment Types:**
- **Cloud Functions**: 1B+ GB-seconds/month
- **Cloud Run**: 500M+ vCPU-seconds/month
- **BigQuery**: 500+ TB/month
- **Cloud Storage**: 1+ TB

### 4. Idle Resource Cleanup

Remove unused functions and resources:

```bash
# Find low-usage functions
./cost-optimizer/cli/cost-cli.sh analyze | jq '.byFunction.functions[] | select(.invocations < 100)'
```

**Cleanup Checklist:**
- [ ] Remove test functions
- [ ] Delete unused function versions
- [ ] Clean up old function deployments
- [ ] Remove unused storage buckets
- [ ] Delete unattached resources

### 5. Data Transfer Optimization

Minimize data transfer costs:

**Strategies:**
- Use Cloud CDN for static content
- Enable compression for API responses
- Cache frequently accessed data
- Use regional endpoints when possible
- Minimize response sizes

### 6. Storage Optimization

Optimize storage costs:

```bash
# Analyze storage costs
./cost-optimizer/cli/cost-cli.sh analyze | jq '.byService.services[] | select(.service | contains("Storage"))'
```

**Best Practices:**
- Use lifecycle policies to delete old data
- Compress archived data
- Use appropriate storage classes
- Delete unneeded objects regularly
- Enable object versioning only when needed

## Budget Management

### Setting Up Budgets

```javascript
const { BudgetTracker } = require('./cost-optimizer/budget/budget-tracker');

const tracker = new BudgetTracker({
  budgets: {
    'overall': { amount: 100, period: 'monthly' }, // $100/month total
    'cloud-functions': { amount: 50, period: 'monthly' }, // $50/month for functions
    'storage': { amount: 10, period: 'monthly' } // $10/month for storage
  },
  thresholds: {
    warning: 80,    // Alert at 80%
    critical: 90,   // Alert at 90%
    emergency: 100  // Auto-scale down at 100%
  }
});

await tracker.monitorSpending();
```

### Budget Alerts

Configure alert notifications:

```javascript
const { BudgetAlerts } = require('./cost-optimizer/budget/budget-alerts');

const alerts = new BudgetAlerts({
  channels: {
    email: 'admin@omniclaw.com',
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    pagerdutyKey: process.env.PAGERDUTY_KEY
  }
});

// Send alerts based on thresholds
await alerts.sendWarning('cloud-functions', 85, 42.50, 50);
await alerts.sendCritical('cloud-functions', 92, 46.00, 50);
await alerts.sendEmergency('cloud-functions', 105, 52.50, 50);
```

### Budget Forecasting

Forecast future spending:

```bash
# Generate budget forecast
./cost-optimizer/cli/cost-cli.sh forecast
```

**Forecast Interpretation:**
- **Projected**: Expected spending based on trends
- **Upper Bound**: 95% confidence upper limit
- **Lower Bound**: 95% confidence lower limit
- **Will Exceed**: Whether budget will be exceeded

## Monitoring and Alerting

### Real-Time Monitoring

Set up continuous cost monitoring:

```javascript
const { AnomalyDetector } = require('./cost-optimizer/reports/anomaly-detector');

const detector = new AnomalyDetector();

// Monitor for anomalies
detector.monitorRealTime(3600000); // Check every hour

// Or check manually
const anomalies = await detector.detectAnomalies('7d');
anomalies.anomalies.forEach(anomaly => {
  console.log(`Anomaly: ${anomaly.description}`);
  console.log(`  Severity: ${anomaly.severity}`);
  console.log(`  Date: ${anomaly.date}`);
});
```

### Cost Dashboard

Access the interactive dashboard:

```bash
# Start dashboard server
node cost-optimizer/dashboard/server.js

# Access at http://localhost:8080
```

### Alert Channels

Configure multiple alert channels:

1. **Email Alerts**: For daily/weekly summaries
2. **Slack Notifications**: For immediate warnings
3. **PagerDuty**: For critical alerts
4. **Webhooks**: For custom integrations

## Best Practices

### 1. Regular Monitoring

**Daily:**
- Check for anomalies
- Review critical alerts

**Weekly:**
- Review cost trends
- Check budget status
- Review optimization recommendations

**Monthly:**
- Generate comprehensive report
- Review and adjust budgets
- Execute optimizations
- Review commitment opportunities

### 2. Optimization Schedule

**Immediate:**
- Fix critical anomalies
- Address budget overruns
- Remove idle resources

**Short-term (1-2 weeks):**
- Apply rightsizing changes
- Implement schedule-based scaling
- Optimize expensive functions

**Long-term (1-3 months):**
- Purchase reserved commitments
- Implement architecture changes
- Optimize data transfer

### 3. Budget Planning

**Steps:**
1. Analyze 3-6 months of historical data
2. Identify seasonal patterns
3. Add 20-30% buffer for growth
4. Set up monitoring and alerts
5. Review and adjust monthly

**Budget Formula:**
```
Monthly Budget = (Average Monthly Cost * 1.2) + (Seasonal Buffer)
```

### 4. Cost Allocation

Track costs by:
- **Function**: Individual function costs
- **Feature**: Feature-specific costs
- **User**: Per-user costs (if applicable)
- **Environment**: Development vs. production

### 5. Optimization Prioritization

**Priority Matrix:**

| Impact | Difficulty | Priority |
|--------|-----------|----------|
| High | Easy | **CRITICAL** |
| High | Medium | **HIGH** |
| High | Hard | **MEDIUM** |
| Medium | Easy | **HIGH** |
| Medium | Medium | **MEDIUM** |
| Medium | Hard | **LOW** |
| Low | Easy | **MEDIUM** |
| Low | Medium | **LOW** |
| Low | Hard | **DEFER** |

## Troubleshooting

### High Costs Unexpectedly

**Symptoms:**
- Sudden cost spike
- Costs increasing without usage increase
- Unexplained charges

**Diagnosis:**
```bash
# Check for anomalies
./cost-optimizer/cli/cost-cli.sh anomalies --period 7d

# Analyze by service
./cost-optimizer/cli/cost-cli.sh analyze | jq '.byService.services[0:3]'

# Check function costs
./cost-optimizer/cli/cost-cli.sh analyze | jq '.byFunction.functions[] | select(.cost > 10)'
```

**Common Causes:**
- Function errors causing retries
- Memory misconfiguration
- Timeout issues
- External API rate limits
- Data transfer overages

**Solutions:**
1. Check function logs for errors
2. Review memory allocation
3. Verify timeout settings
4. Check external API usage
5. Monitor retry logic

### Budget Overruns

**Symptoms:**
- Consistently exceeding budget
- Unexpected charges

**Diagnosis:**
```bash
# Check budget status
./cost-optimizer/cli/cost-cli.sh budget

# Forecast spending
./cost-optimizer/cli/cost-cli.sh forecast

# Get recommendations
./cost-optimizer/cli/cost-cli.sh optimize
```

**Solutions:**
1. Implement quick wins from recommendations
2. Scale down non-essential functions
3. Enable schedule-based scaling
4. Increase budget if necessary

### Inefficient Functions

**Symptoms:**
- High cost per invocation
- Low efficiency scores

**Diagnosis:**
```bash
# Check efficiency
node -e "
const { CostAnalyzer } = require('./cost-optimizer/cost-analyzer');
const analyzer = new CostAnalyzer();

(async () => {
  const efficiency = await analyzer.analyzeEfficiency('30d');
  efficiency.functions
    .filter(f => f.efficiency < 50)
    .forEach(f => {
      console.log(\`\${f.name}: Efficiency \${f.efficiency}/100\`);
      console.log(\`  Recommendations: \${f.recommendations.join(', ')}\`);
    });
})();
"
```

**Solutions:**
1. Reduce memory allocation
2. Optimize execution time
3. Cache frequently used data
4. Optimize external API calls
5. Review algorithm efficiency

## Quick Reference

### Essential Commands

```bash
# Quick cost check
./cost-optimizer/cli/cost-cli.sh analyze

# Generate report
./cost-optimizer/cli/cost-cli.sh report --format html --output report.html

# Check budget
./cost-optimizer/cli/cost-cli.sh budget

# Get optimizations
./cost-optimizer/cli/cost-cli.sh optimize

# Detect anomalies
./cost-optimizer/cli/cost-cli.sh anomalies

# View trends
./cost-optimizer/cli/cost-cli.sh trends
```

### Cost Optimization Checklist

- [ ] Set up BigQuery billing export
- [ ] Configure budget thresholds
- [ ] Run initial cost analysis
- [ ] Review optimization recommendations
- [ ] Implement rightsizing changes
- [ ] Set up schedule-based scaling
- [ ] Configure auto-optimization
- [ ] Set up monitoring dashboard
- [ ] Configure alert notifications
- [ ] Document cost allocation strategy

## Support and Resources

### Documentation
- [Cost Optimizer README](./cost-optimizer/README.md)
- [GCP Billing Documentation](https://cloud.google.com/billing/docs)
- [Cloud Functions Pricing](https://cloud.google.com/functions/pricing)

### Tools
- Cost Optimizer CLI: `./cost-optimizer/cli/cost-cli.sh`
- Node.js API: See individual module documentation
- Dashboard: `node cost-optimizer/dashboard/server.js`

### Getting Help
- Review logs in Cloud Console
- Check GCP Billing reports
- Analyze function logs
- Review monitoring metrics

---

**Last Updated**: 2026-03-27
**Version**: 1.0.0
