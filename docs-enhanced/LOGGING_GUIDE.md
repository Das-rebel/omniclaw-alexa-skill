# OmniClaw Enhanced - Logging Guide

Complete guide to using the OmniClaw Enhanced logging system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Logging Best Practices](#logging-best-practices)
3. [CLI Tools Reference](#cli-tools-reference)
4. [Query Examples](#query-examples)
5. [Dashboard Setup](#dashboard-setup)
6. [Alert Configuration](#alert-configuration)
7. [Performance Tuning](#performance-tuning)

## Quick Start

### 1. Initialize Logging in Your Function

```javascript
// In your Cloud Function
const { getAggregator, logFunction } = require('./logging/log-aggregator');

exports.handler = async (req, res) => {
  const logger = getAggregator();

  try {
    // Log request start
    await logger.info('Request received', {
      method: req.method,
      path: req.path,
      userId: req.user?.id
    });

    // Process request
    const result = await logFunction('my-function', async () => {
      // Your business logic here
      return processData(req.body);
    }, {
      userId: req.user?.id,
      requestId: req.id
    });

    // Log success
    await logger.info('Request completed', {
      statusCode: 200,
      userId: req.user?.id
    });

    res.json(result);
  } catch (error) {
    // Log error
    await logger.error('Request failed', {
      errorCode: error.code,
      errorMessage: error.message,
      stackTrace: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({ error: 'Internal server error' });
  }
};
```

### 2. View Logs in Real-Time

```bash
# View all logs
./logging/scripts/view-logs.sh

# View specific function
./logging/scripts/view-logs.sh -f omniclaw-price

# View only errors
./logging/scripts/view-logs.sh -s ERROR

# View with filters
./logging/scripts/view-logs.sh -f omniclaw-price -s ERROR -u user123
```

### 3. Search Historical Logs

```bash
# Search by text
./logging/scripts/search-logs.sh -q "timeout"

# Search by time range
./logging/scripts/search-logs.sh --start 1d -s ERROR

# Export results
./logging/scripts/search-logs.sh -s ERROR --export errors.json
```

## Logging Best Practices

### DO ✅

**1. Use Appropriate Log Levels**

```javascript
// DEBUG - Detailed diagnostics
await logger.debug('Cache miss for key', { key: 'price_123' });

// INFO - Normal operations
await logger.info('User logged in', { userId: 'user123' });

// WARN - Potential issues
await logger.warn('High memory usage', { usage: '90%' });

// ERROR - Errors that don't stop execution
await logger.error('External API timeout', { endpoint: '/api/external' });

// CRITICAL - System-breaking errors
await logger.critical('Database connection failed', { error: 'ECONNREFUSED' });
```

**2. Include Context**

```javascript
await logger.info('Processing payment', {
  userId: 'user123',
  orderId: 'order456',
  amount: 99.99,
  currency: 'USD',
  paymentMethod: 'credit_card'
});
```

**3. Use Structured Data**

```javascript
// Good
await logger.info('Request processed', {
  duration: 1234,
  statusCode: 200,
  cacheHit: true
});

// Avoid
await logger.info('Request processed in 1234ms with status 200, cache hit: true');
```

**4. Track Request Lifecycle**

```javascript
// Start
const requestId = `req_${Date.now()}`;
await logger.info('Request started', { requestId, path: req.path });

// Progress
await logger.info('Processing step 1', { requestId, step: 'validation' });
await logger.info('Processing step 2', { requestId, step: 'database' });

// Complete
await logger.info('Request completed', { requestId, duration: totalMs });
```

### DON'T ❌

**1. Don't Log Sensitive Data**

```javascript
// Bad
await logger.info('User login', {
  email: 'user@example.com',
  password: 'secret123'
});

// Good
await logger.info('User login', {
  userId: 'user123',
  email: '***@example.com'
});
```

**2. Don't Log Excessively**

```javascript
// Bad - Logging in a loop
for (let i = 0; i < 10000; i++) {
  await logger.debug('Processing item', { index: i });
}

// Good - Summary logging
await logger.info('Batch processing started', { itemCount: 10000 });
// ... process batch ...
await logger.info('Batch processing completed', {
  itemCount: 10000,
  duration: totalMs
});
```

**3. Don't Use Message Strings for Everything**

```javascript
// Bad
await logger.info('ERROR_TIMEOUT_DATABASE_CONNECTION_FAILED');

// Good
await logger.error('Database connection failed', {
  errorCode: 'TIMEOUT',
  errorType: 'CONNECTION_FAILED'
});
```

## CLI Tools Reference

### view-logs.sh

Stream logs in real-time.

```bash
# Usage
view-logs.sh [OPTIONS]

# Options
-f, --function FUNCTION    Filter by function name
-s, --severity SEVERITY    Filter by severity
-u, --user USER_ID         Filter by user ID
-r, --request REQUEST_ID   Filter by request ID
-t, --tail                 Show recent logs and exit
-n, --lines LINES          Number of lines (default: 100)

# Examples
view-logs.sh                                    # Stream all logs
view-logs.sh -f omniclaw-price                  # Stream specific function
view-logs.sh -s ERROR -t                        # Show recent errors
view-logs.sh -u user123 -n 50                   # Show 50 lines for user
```

### search-logs.sh

Search historical logs.

```bash
# Usage
search-logs.sh [OPTIONS]

# Options
-q, --query QUERY          Full-text search
-f, --function FUNCTION    Filter by function
-s, --severity SEVERITY    Filter by severity
--start TIME              Start time (1h, 1d, 1w)
--end TIME                End time
-l, --limit LIMIT          Max results (default: 100)
-o, --output FORMAT        Output: table, json, csv
-e, --export FILE          Export to file

# Examples
search-logs.sh -q "timeout"                          # Search text
search-logs.sh -s ERROR --start 1d                    # Last day's errors
search-logs.sh -f omniclaw-price -l 50 -o json        # JSON output
search-logs.sh -s ERROR --export errors.json          # Export
```

### export-logs.sh

Export logs to files.

```bash
# Usage
export-logs.sh [OPTIONS]

# Options
-f, --format FORMAT        Output: json, csv, jsonl
-o, --output FILE          Output file
--start TIME              Start time
--end TIME                End time
--function FUNCTION       Filter by function
--severity SEVERITY       Filter by severity
--compress                Compress with gzip

# Examples
export-logs.sh --start 1d -o logs.json              # Last day to JSON
export-logs.sh -s ERROR -f csv -o errors.csv        # Errors to CSV
export-logs.sh --start 1w --compress -o logs.json.gz # Compressed
```

### analyze-logs.sh

Generate analytics reports.

```bash
# Usage
analyze-logs.sh [OPTIONS]

# Options
-r, --report TYPE          Report: summary, errors, performance, cost, all
--start TIME              Start time
--end TIME                End time
-o, --output FILE          Output file
-f, --format FORMAT        Output: json, html, text
--detailed                 Include detailed breakdown

# Examples
analyze-logs.sh -r summary --start 1d                # Summary report
analyze-logs.sh -r errors --start 1w -o errors.json  # Error report
analyze-logs.sh -r all --detailed                    # All reports
```

## Query Examples

### Using BigQuery SQL

**Request Volume Trends**

```sql
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
  COUNT(*) as requests,
  COUNT(DISTINCT userId) as uniqueUsers
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), HOUR 24)
GROUP BY hour
ORDER BY hour ASC
```

**Error Analysis**

```sql
SELECT
  function,
  errorCode,
  COUNT(*) as errorCount,
  COUNT(DISTINCT userId) as affectedUsers,
  MAX(timestamp) as lastOccurrence
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE severity = 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)
GROUP BY function, errorCode
ORDER BY errorCount DESC
```

**Performance Analysis**

```sql
SELECT
  function,
  COUNT(*) as requests,
  AVG(duration) as avgDuration,
  MIN(duration) as minDuration,
  MAX(duration) as maxDuration,
  PERCENTILE_CONT(duration, 0.95) OVER() as p95
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE duration IS NOT NULL
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)
GROUP BY function, duration
ORDER BY avgDuration DESC
```

### Using the Query Builder (JavaScript)

```javascript
const QueryBuilder = require('./analytics/query-builder');

const builder = new QueryBuilder();

// Request volume query
const volumeQuery = QueryBuilder.requestVolume({
  startTime: new Date(Date.now() - 86400000),
  endTime: new Date()
});

const { query, params } = volumeQuery.getQuery();
const results = await bigquery.query({ query, params });
```

## Dashboard Setup

### Cloud Logging Dashboard

```bash
# Create dashboard in Cloud Logging
gcloud logging dashboards create omniclaw-logs \
  --project=omniclaw-enhanced

# Add widgets
gcloud logging dashboards create omnicaw-logs \
  --widget-from-file=logging/dashboards/logging-dashboard.json
```

### Custom Dashboard

```javascript
// Use the metrics calculator
const MetricCalculator = require('./analytics/metric-calculator');
const calculator = new MetricCalculator();

const metrics = await calculator.calculateDashboardMetrics(
  new Date(Date.now() - 86400000),
  new Date()
);

// metrics contains:
// - sla: SLA compliance by function
// - errors: Error rate trends
// - performance: Latency percentiles
// - throughput: Request volume
// - users: User engagement
// - success: Success rates
// - costs: Cost analysis
// - anomalies: Detected anomalies
```

## Alert Configuration

### Create Log-Based Alerts

```bash
# Create alert policy for high error rate
gcloud alpha logging alerts create \
  --project=omniclaw-enhanced \
  --display-name="High Error Rate" \
  --condition-filter='severity>=ERROR' \
  --condition-threshold=10 \
  --condition-window=300 \
  --notification-channels=${EMAIL_CHANNEL}
```

### Alert Rules (YAML)

See `logging/dashboards/alert-rules.yaml` for predefined alert rules.

```yaml
alerts:
  - name: High Error Rate
    condition: severity >= ERROR
    threshold: 10
    window: 5m
    notification: email

  - name: Slow Performance
    condition: duration > 5000
    threshold: 5
    window: 1m
    notification: email

  - name: Critical System Error
    condition: severity >= CRITICAL
    threshold: 1
    window: 1m
    notification: sms
```

## Performance Tuning

### Optimize Log Volume

```javascript
// 1. Use sampling for high-volume logs
if (Math.random() < 0.1) { // 10% sampling
  await logger.debug('Detailed debug info', { ... });
}

// 2. Batch logs where possible
const logs = [];
for (const item of items) {
  logs.push({ message: 'Processing item', itemId: item.id });
}
await logger.info('Batch processing', { items: logs });

// 3. Use appropriate log levels
await logger.debug('Will be filtered in production');
await logger.info('Important but not critical');
await logger.error('Needs attention');
```

### Optimize Queries

```sql
-- 1. Use time partitioning
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)

-- 2. Use clustering
WHERE function = 'omniclaw-price' AND severity = 'ERROR'

-- 3. Limit results
LIMIT 1000

-- 4. Use materialized views for common queries
SELECT * FROM `omniclaw-enhanced.omniclaw_logs.daily_summary`
WHERE date = CURRENT_DATE()
```

### Cost Optimization

```bash
# 1. Check query costs
bq query --project_id=omniclaw-enhanced --dry_run \
  "SELECT * FROM \`omniclaw-enhanced.omniclaw_logs.function_logs\`"

# 2. Use query cache
bq query --project_id=omniclaw-enhanced \
  --use_legacy_sql=false \
  --use_cache=true \
  "SELECT COUNT(*) FROM ... "

# 3. Set up automatic log expiration
bq update --default_table_expiration 2592000 \
  omniclaw-enhanced:omniclaw_logs.function_logs
```

## Troubleshooting

### Common Issues and Solutions

**Issue: Logs not appearing**

```bash
# 1. Check Cloud Function logs
gcloud functions logs read [FUNCTION_NAME] --project=omniclaw-enhanced

# 2. Check log aggregator
gcloud functions logs read log-aggregator --project=omniclaw-enhanced

# 3. Verify BigQuery table exists
bq show omniclaw-enhanced:omniclaw_logs.function_logs
```

**Issue: High query costs**

```bash
# 1. Check most expensive queries
bq query --project_id=omniclaw-enhanced "
SELECT
  query,
  total_bytes_billed / 1000000000000 as cost_in_tb
FROM \`region-us.INFORMATION_SCHEMA.JOBS_BY_USER\`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 7)
ORDER BY cost_in_tb DESC
LIMIT 10
"

# 2. Add caching layer
# 3. Use pre-aggregated tables
# 4. Reduce query frequency
```

**Issue: Missing error logs**

```bash
# 1. Check error routing
grep "severity.*ERROR" /path/to/log-aggregator.js

# 2. Verify error handling in functions
gcloud functions deploy [FUNCTION_NAME] \
  --project=omniclaw-enhanced \
  --entry-point=handler

# 3. Test error logging
node -e "
const { getAggregator } = require('./logging/log-aggregator');
(async () => {
  const logger = getAggregator();
  await logger.error('Test error', { test: true });
})();
"
```

## Advanced Topics

### Custom Log Enrichment

```javascript
// Add custom metadata to all logs
const enrichLog = (entry) => {
  entry.metadata.version = '1.0.0';
  entry.metadata.environment = 'production';
  entry.metadata.deployment = 'blue';
  return entry;
};

// Use in log aggregator
const enrichedEntry = enrichLog(logEntry);
```

### Log Transformation

```javascript
// Transform logs before storage
const transformLog = (entry) => {
  // Remove sensitive data
  delete entry.metadata.password;

  // Add computed fields
  entry.costEstimate = entry.duration * 0.00001;

  return entry;
};
```

### Multi-Region Logging

```javascript
// Route logs to regional storage
const region = process.env.GCP_REGION || 'us-central1';
const dataset = `omniclaw_logs_${region}`;

await bigquery.dataset(dataset).table('function_logs').insert([logEntry]);
```

## Support

For issues and questions:
- Check [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)
- Review [API Documentation](../docs/API_DOCUMENTATION.md)
- Open an issue on GitHub
