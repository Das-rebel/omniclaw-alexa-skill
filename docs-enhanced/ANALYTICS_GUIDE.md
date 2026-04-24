# OmniClaw Enhanced - Analytics Guide

Comprehensive guide to log analytics and insights.

## Table of Contents

1. [Analytics Overview](#analytics-overview)
2. [Metric Calculation](#metric-calculation)
3. [Report Generation](#report-generation)
4. [Anomaly Detection](#anomaly-detection)
5. [Performance Analysis](#performance-analysis)
6. [Cost Analysis](#cost-analysis)
7. [User Behavior Analysis](#user-behavior-analysis)

## Analytics Overview

The analytics pipeline provides comprehensive insights into system performance, user behavior, and operational metrics.

### Available Analytics

| Type | Description | Use Case |
|------|-------------|----------|
| **SLA Compliance** | Track service level agreements | Monitor uptime and performance |
| **Error Rates** | Error frequency and trends | Identify reliability issues |
| **Latency** | Response time percentiles | Performance optimization |
| **Throughput** | Request volume over time | Capacity planning |
| **User Engagement** | User activity patterns | Product improvement |
| **Cost Analysis** | Operational costs | Budget optimization |
| **Anomalies** | Unusual patterns | Issue detection |

## Metric Calculation

### Using the Metric Calculator

```javascript
const MetricCalculator = require('./analytics/metric-calculator');

const calculator = new MetricCalculator({
  projectId: 'omniclaw-enhanced',
  dataset: 'omniclaw_logs',
  table: 'function_logs'
});

// Calculate SLA compliance
const sla = await calculator.calculateSLACompliance(
  new Date(Date.now() - 86400000), // Last 24 hours
  new Date(),
  5000 // 5 second threshold
);

// Output:
// [
//   {
//     function: 'omniclaw-price',
//     totalRequests: 10000,
//     compliantRequests: 9950,
//     slaCompliancePercentage: 99.5,
//     avgDuration: 1234
//   }
// ]
```

### Available Metrics

#### 1. SLA Compliance

```javascript
const sla = await calculator.calculateSLACompliance(startTime, endTime, threshold);

// Returns:
// - totalRequests: Total request count
// - compliantRequests: Requests meeting SLA
// - slaCompliancePercentage: Compliance percentage
// - avgDuration: Average duration
// - maxDuration: Maximum duration
```

#### 2. Error Rate Trends

```javascript
const errors = await calculator.calculateErrorRateTrends(
  startTime,
  endTime,
  'HOUR' // Bucket size: MINUTE, HOUR, DAY
);

// Returns:
// - timeBucket: Time interval
// - function: Function name
// - totalRequests: Total requests
// - errorCount: Error count
// - errorRate: Error rate percentage
```

#### 3. Latency Percentiles

```javascript
const latency = await calculator.calculatePercentiles(
  startTime,
  endTime,
  [50, 75, 90, 95, 99] // Percentiles to calculate
);

// Returns:
// - requestCount: Request count
// - avgDuration: Average duration
// - minDuration: Minimum duration
// - maxDuration: Maximum duration
// - stdDevDuration: Standard deviation
// - p50, p75, p90, p95, p99: Percentiles
```

#### 4. Throughput Metrics

```javascript
const throughput = await calculator.calculateThroughput(
  startTime,
  endTime,
  'MINUTE' // Interval
);

// Returns:
// - timeBucket: Time interval
// - requestCount: Request count
// - prevRequestCount: Previous interval count
// - change: Change from previous
```

#### 5. User Engagement

```javascript
const engagement = await calculator.calculateUserEngagement(startTime, endTime);

// Returns:
// - totalActiveUsers: Active user count
// - avgRequestsPerUser: Average requests per user
// - avgFunctionsPerUser: Average functions used
// - powerUsers: Users with >10 requests
// - singleVisitUsers: Users with 1 request
```

## Report Generation

### Executive Summary

```javascript
const ReportGenerator = require('./analytics/report-generator');

const generator = new ReportGenerator({
  outputDir: '/tmp/reports'
});

// Generate executive summary
const summary = await generator.generateExecutiveSummary(
  new Date(Date.now() - 86400000),
  new Date()
);

// Output:
{
  title: 'OmniClaw Enhanced - Executive Summary',
  period: {
    start: '2024-03-26',
    end: '2024-03-27'
  },
  summary: {
    totalRequests: 100000,
    overallSuccessRate: 99.5,
    totalCost: 12.50,
    activeUsers: 500
  },
  performance: { ... },
  errors: { ... },
  recommendations: [ ... ]
}

// Save as JSON
await generator.saveAsJSON(summary, 'executive-summary.json');

// Save as HTML
await generator.saveAsHTML(summary, 'executive-summary.html');
```

### Technical Report

```javascript
const technical = await generator.generateTechnicalReport(startTime, endTime);

// Includes:
// - Function-by-function breakdown
// - Performance metrics
// - Error analysis
// - Anomaly detection
// - Cost breakdown
```

### Error Analysis Report

```javascript
const errorReport = await generator.generateErrorReport(startTime, endTime);

// Includes:
// - Total error count
// - Error categorization
// - Top errors by frequency
// - Error trends over time
// - Affected users
```

### Performance Report

```javascript
const perfReport = await generator.generatePerformanceReport(startTime, endTime);

// Includes:
// - Latency percentiles
// - SLA compliance
// - Performance by function
// - Performance trends
```

### Cost Report

```javascript
const costReport = await generator.generateCostReport(startTime, endTime);

// Includes:
// - Total cost breakdown
// - Cost by function
// - Cost optimization recommendations
// - Cost trends
```

## Anomaly Detection

### Detect Anomalies

```javascript
const AnomalyDetector = require('./analytics/anomaly-detector');

const detector = new AnomalyDetector({
  projectId: 'omniclaw-enhanced',
  zScoreThreshold: 3, // Standard deviations
  errorRateThreshold: 5, // Percentage
  durationThreshold: 10000 // Milliseconds
});

// Detect all anomalies
const anomalies = await detector.detectAnomalies(startTime, endTime);

// Output:
{
  durationAnomalies: [
    {
      type: 'duration',
      function: 'omniclaw-price',
      timestamp: '2024-03-27T10:30:00Z',
      value: 15000,
      expected: 2000,
      zScore: 5.2,
      severity: 'critical'
    }
  ],
  errorRateAnomalies: [ ... ],
  volumeAnomalies: [ ... ],
  patternAnomalies: [ ... ],
  totalAnomalies: 15
}
```

### Anomaly Types

#### 1. Duration Anomalies

Unusual request durations (z-score > 3).

```javascript
const duration = await detector.detectDurationAnomalies(startTime, endTime);

// Detects:
// - Very slow requests
// - Very fast requests (possible errors)
// - Performance degradation
```

#### 2. Error Rate Anomalies

Spikes in error rates.

```javascript
const errorRate = await detector.detectErrorRateAnomalies(startTime, endTime);

// Detects:
// - Sudden error increases
// - Error storms
// - Function-specific issues
```

#### 3. Volume Anomalies

Unusual request volumes.

```javascript
const volume = await detector.detectVolumeAnomalies(startTime, endTime);

// Detects:
// - Traffic spikes
// - Traffic drops
// - DDoS attacks
// - Outages
```

#### 4. Pattern Anomalies

Unusual patterns in logs.

```javascript
const patterns = await detector.detectPatternAnomalies(startTime, endTime);

// Detects:
// - Rapid retries
// - Error storms
// - Unusual user behavior
```

### Anomaly Alerts

```javascript
// Create alert for anomaly
const alert = await detector.createAlert(anomalies.durationAnomalies[0]);

// Output:
{
  alertId: 'alert_1711535400000_abc123',
  timestamp: '2024-03-27T10:30:00Z',
  anomaly: { ... },
  status: 'open',
  acknowledged: false,
  resolved: false
}
```

## Performance Analysis

### Query Performance

```javascript
const QueryBuilder = require('./analytics/query-builder');

const builder = new QueryBuilder();

// Performance query
const perfQuery = builder
  .select(
    'function',
    'COUNT(*) as requestCount',
    'AVG(duration) as avgDuration',
    'PERCENTILE_CONT(duration, 0.95) OVER() as p95'
  )
  .whereTimeRange(startTime, endTime)
  .group('function')
  .order('avgDuration', 'DESC');

const { query, params } = perfQuery.getQuery();
const results = await bigquery.query({ query, params });
```

### Function Performance

```javascript
// Compare performance over time
const LogAnalyzer = require('./logging/tools/log-analyzer');

const analyzer = new LogAnalyzer();

// Compare two periods
const comparison = await analyzer.comparePeriods(
  new Date(Date.now() - 86400000 * 2), // 2 days ago
  new Date(Date.now() - 86400000),     // 1 day ago
  new Date(Date.now() - 86400000),     // 1 day ago
  new Date()                            // Now
);

// Output:
[
  {
    function: 'omniclaw-price',
    period1Requests: 10000,
    period2Requests: 12000,
    requestChange: 20.0,
    period1Duration: 2000,
    period2Duration: 1800,
    durationChange: -10.0
  }
]
```

### Performance Optimization Insights

```javascript
// Get optimization recommendations
const insights = await analyzer.generateInsights(startTime, endTime);

// Returns:
[
  {
    type: 'performance',
    severity: 'medium',
    title: 'Performance Outliers Detected',
    description: 'Found 50 requests with unusual duration patterns',
    recommendation: 'Review outlier requests for optimization opportunities'
  }
]
```

## Cost Analysis

### Calculate Costs

```javascript
const costs = await calculator.calculateCostMetrics(startTime, endTime);

// Output:
[
  {
    function: 'omniclaw-price',
    invocationCount: 100000,
    avgCpuSeconds: 2.5,
    totalCpuSeconds: 250000,
    invocationCost: 0.04,
    queryCost: 0.01,
    totalCost: 0.05
  }
]
```

### Cost Optimization

```javascript
// Generate cost report
const costReport = await generator.generateCostReport(startTime, endTime);

// Includes recommendations:
const recommendations = costReport.recommendations;

// Example:
[
  {
    type: 'optimization',
    message: '2 functions have costs 2x above average',
    functions: ['omniclaw-analytics', 'omniclaw-story']
  }
]
```

### Cost Trends

```javascript
// Track costs over time
const costTrends = await analyzer.analyzeCostTrends(startTime, endTime, 'DAY');

// Output:
[
  {
    date: '2024-03-26',
    totalCost: 10.50,
    invocationCost: 8.00,
    queryCost: 2.50
  },
  // ... more days
]
```

## User Behavior Analysis

### User Activity

```javascript
const userActivity = await calculator.calculateUserActivityPatterns(
  startTime,
  endTime
);

// Output:
[
  {
    userId: 'user123',
    requestCount: 100,
    functionsUsed: 5,
    firstSeen: '2024-03-27T00:00:00Z',
    lastSeen: '2024-03-27T23:59:59Z',
    dayOfWeek: 3,
    hourOfDay: 14
  }
]
```

### Session Analysis

```javascript
const sessions = await calculator.calculateSessionMetrics(
  startTime,
  endTime,
  1800000 // 30 minute timeout
);

// Output:
{
  totalSessions: 500,
  uniqueUsers: 300,
  avgSessionLength: 1200000, // 20 minutes
  maxSessionLength: 3600000, // 60 minutes
  avgRequestsPerSession: 5
}
```

### User Segmentation

```javascript
// Segment users by activity
const powerUsers = engagement.powerUsers;
const singleVisitUsers = engagement.singleVisitUsers;

// Output:
{
  powerUsers: 50,        // > 10 requests
  singleVisitUsers: 200, // 1 request
  totalActiveUsers: 500
}
```

## Advanced Analytics

### Predictive Analytics

```javascript
// Predict future volume
const predictions = await analyzer.predictVolume(startTime, endTime);

// Output:
[
  {
    hourOfDay: 14,
    dayOfWeek: 3,
    avgVolume: 1000,
    stdDevVolume: 100,
    minVolume: 800,
    maxVolume: 1200
  }
]

// Use for capacity planning
const predictedPeak = predictions.reduce((max, p) =>
  p.avgVolume > max.avgVolume ? p : max
);

console.log(`Peak volume expected at hour ${predictedPeak.hourOfDay}`);
```

### Correlation Analysis

```javascript
// Find correlations between metrics
const correlations = await analyzer.analyzeCorrelations(startTime, endTime);

// Output:
[
  {
    type: 'severity_duration',
    correlation: 'higher severity associated with longer duration',
    data: [
      {
        severity: 'INFO',
        avgDuration: 1000
      },
      {
        severity: 'ERROR',
        avgDuration: 5000
      }
    ]
  }
]
```

### Custom Metrics

```javascript
// Define custom metric
const customMetric = await analyzer.aggregate(
  'function',
  [
    { function: 'COUNT', field: '*', alias: 'requestCount' },
    { function: 'AVG', field: 'duration', alias: 'avgDuration' },
    { function: 'SUM', field: 'CASE WHEN severity = "ERROR" THEN 1 ELSE 0 END', alias: 'errorCount' }
  ],
  { startTime, endTime }
);

// Output:
[
  {
    function: 'omniclaw-price',
    requestCount: 10000,
    avgDuration: 2000,
    errorCount: 50
  }
]
```

## Best Practices

### 1. Define Clear KPIs

```javascript
// Define key performance indicators
const KPIs = {
  availability: 99.9, // 99.9% uptime
  p95Latency: 3000,   // < 3 seconds
  errorRate: 0.1,     // < 0.1% errors
  costPerRequest: 0.0001 // $0.0001 per request
};

// Monitor against KPIs
const metrics = await calculator.calculateDashboardMetrics(startTime, endTime);

const kpiStatus = {
  availability: metrics.sla[0].slaCompliancePercentage >= KPIs.availability,
  p95Latency: metrics.performance[0].p95 <= KPIs.p95Latency,
  errorRate: metrics.errors[0].errorRate <= KPIs.errorRate,
  costPerRequest: metrics.costs[0].totalCost / metrics.summary.totalRequests <= KPIs.costPerRequest
};
```

### 2. Set Up Automated Alerts

```javascript
// Check for anomalies and alert
const anomalies = await detector.detectAnomalies(startTime, endTime);

for (const anomaly of anomalies.durationAnomalies) {
  if (anomaly.severity === 'critical') {
    await sendAlert({
      type: 'critical',
      message: `Critical duration anomaly in ${anomaly.function}`,
      details: anomaly
    });
  }
}
```

### 3. Regular Reporting

```javascript
// Schedule daily reports
const schedule = require('node-schedule');

schedule.scheduleJob('0 9 * * *', async () => { // 9 AM daily
  const report = await generator.generateExecutiveSummary(
    new Date(Date.now() - 86400000),
    new Date()
  );

  await sendEmail({
    to: 'team@example.com',
    subject: 'Daily OmniClaw Report',
    body: JSON.stringify(report, null, 2)
  });
});
```

## Troubleshooting

### Common Analytics Issues

**Issue: Slow queries**

```javascript
// Solution: Use time partitioning
const builder = new QueryBuilder();
builder.whereTimeRange(startTime, endTime); // Uses partitioning

// Solution: Use clustering
builder.whereFunction('omniclaw-price'); // Uses clustering
```

**Issue: High costs**

```javascript
// Solution: Use cached results
const cachedResults = await cache.get('analytics:daily');
if (cachedResults) {
  return cachedResults;
}

// Solution: Use pre-aggregated tables
const summary = await bigquery.query(`
  SELECT * FROM \`omniclaw_logs.daily_summary\`
  WHERE date = CURRENT_DATE()
`);
```

**Issue: Missing data**

```javascript
// Solution: Check data availability
const stats = await calculator.getStatistics(startTime, endTime);
console.log('Data points:', stats.length);

// Solution: Extend time range
const extendedStart = new Date(startTime.getTime() - 86400000);
const results = await calculator.calculateMetrics(extendedStart, endTime);
```

## Support

For analytics questions:
- Review [API Documentation](./docs/API_DOCUMENTATION.md)
- Check [Logging Guide](./LOGGING_GUIDE.md)
- Open an issue on GitHub
