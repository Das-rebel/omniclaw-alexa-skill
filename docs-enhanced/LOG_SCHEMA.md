# OmniClaw Enhanced - Log Schema Reference

Complete reference for the log schema used across OmniClaw Enhanced.

## Core Schema

### Log Entry Structure

```json
{
  "timestamp": "string (ISO 8601)",
  "severity": "string (enum)",
  "function": "string",
  "requestId": "string (UUID)",
  "userId": "string",
  "duration": "number (milliseconds)",
  "message": "string",
  "metadata": "object",
  "tags": "array of strings",
  "environment": "string (enum)",
  "region": "string",
  "statusCode": "number",
  "errorCode": "string",
  "stackTrace": "string"
}
```

## Field Specifications

### Required Fields

#### timestamp
- **Type**: `TIMESTAMP`
- **Format**: ISO 8601 (UTC)
- **Description**: Exact time when the log entry was created
- **Example**: `"2024-03-27T10:30:00.123Z"`
- **Validation**: Must be valid ISO 8601 timestamp

#### severity
- **Type**: `STRING`
- **Format**: Enum (case-sensitive)
- **Values**:
  - `DEBUG`: Detailed diagnostic information
  - `INFO`: General informational messages
  - `WARN`: Warning messages for potentially harmful situations
  - `ERROR`: Error events that might still allow the application to continue
  - `CRITICAL`: Critical events that could lead to application failure
- **Example**: `"INFO"`
- **Validation**: Must be one of the enum values

#### function
- **Type**: `STRING`
- **Format**: Alphanumeric with hyphens
- **Description**: Name of the Cloud Function that generated the log
- **Example**: `"omniclaw-price"`
- **Validation**: Must match deployed function name

#### requestId
- **Type**: `STRING`
- **Format**: UUID or custom ID
- **Description**: Unique identifier for tracking a request across multiple log entries
- **Example**: `"req_1711535400123_abc123def456"`
- **Validation**: Must be unique within the request lifecycle

### Optional Fields

#### userId
- **Type**: `STRING`
- **Format**: User identifier
- **Description**: User ID associated with the request
- **Example**: `"user_12345"` or `"anonymous"`
- **Default**: `"anonymous"`
- **Validation**: Can be empty string for unauthenticated requests

#### duration
- **Type**: `INTEGER`
- **Format**: Milliseconds
- **Description**: Execution duration in milliseconds
- **Example**: `1234`
- **Range**: 0 to 3600000 (1 hour)
- **Default**: `null`
- **Validation**: Must be non-negative integer

#### message
- **Type**: `STRING`
- **Format**: Free text
- **Description**: Human-readable log message
- **Example**: `"Processing request completed successfully"`
- **Max Length**: 10000 characters
- **Validation**: Should not contain sensitive data

#### metadata
- **Type**: `JSON`
- **Format**: JSON object
- **Description**: Additional structured metadata
- **Example**:
  ```json
  {
    "endpoint": "/api/price",
    "method": "GET",
    "userAgent": "Mozilla/5.0...",
    "clientIp": "192.168.1.1"
  }
  ```
- **Max Size**: 10 KB
- **Validation**: Must be valid JSON, sensitive data auto-redacted

#### tags
- **Type**: `ARRAY<STRING>`
- **Format**: Array of strings
- **Description**: Tags for categorization and filtering
- **Example**: `["api", "price", "cache-hit"]`
- **Max Length**: 50 tags, 100 characters each
- **Validation**: All elements must be strings

#### environment
- **Type**: `STRING`
- **Format**: Enum
- **Values**: `development`, `staging`, `production`
- **Description**: Deployment environment
- **Example**: `"production"`
- **Default**: `NODE_ENV` or `"development"`

#### region
- **Type**: `STRING`
- **Format**: GCP region name
- **Description**: GCP region where the function executed
- **Example**: `"us-central1"`
- **Default**: Process environment or `"us-central1"`

#### statusCode
- **Type**: `INTEGER`
- **Format**: HTTP status code
- **Description**: HTTP status code for the response
- **Example**: `200`, `404`, `500`
- **Range**: 100-599
- **Default**: `null`
- **Validation**: Must be valid HTTP status code

#### errorCode
- **Type**: `STRING`
- **Format**: Error code identifier
- **Description**: Machine-readable error code
- **Example**: `"TIMEOUT"`, `"RATE_LIMIT_EXCEEDED"`, `"AUTH_FAILED"`
- **Max Length**: 100 characters
- **Validation**: Alphanumeric with underscores

#### stackTrace
- **Type**: `STRING`
- **Format**: Stack trace string
- **Description**: Stack trace for errors (only for ERROR/CRITICAL)
- **Example**: `"Error: Timeout\n    at Connection.connect ..."`
- **Max Length**: 10000 characters
- **Default**: `null`
- **Validation**: Only included for error logs

## BigQuery Schema

```sql
CREATE TABLE `omniclaw-enhanced.omniclaw_logs.function_logs`
(
  timestamp TIMESTAMP NOT NULL,
  severity STRING NOT NULL,
  function STRING NOT NULL,
  requestId STRING NOT NULL,
  userId STRING NULLABLE,
  duration INTEGER NULLABLE,
  message STRING NOT NULL,
  metadata JSON NULLABLE,
  tags ARRAY<STRING> NULLABLE,
  environment STRING NOT NULL,
  region STRING NOT NULL,
  statusCode INTEGER NULLABLE,
  errorCode STRING NULLABLE,
  stackTrace STRING NULLABLE,
  ingestionTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY timestamp
CLUSTER BY function, severity, environment
OPTIONS (
  partition_expiration_days = 30,
  require_partition_filter = false
)
```

## Field Constraints

### Sensitive Data Handling

The following fields are automatically sanitized:
- `metadata.password`
- `metadata.token`
- `metadata.apiKey`
- `metadata.secret`
- `metadata.credential`

**Example**:
```json
{
  "metadata": {
    "password": "[REDACTED]",
    "apiKey": "[REDACTED]",
    "endpoint": "/api/users"  // Not redacted
  }
}
```

### Field Size Limits

| Field | Max Size | Notes |
|-------|----------|-------|
| `message` | 10 KB | Truncated if exceeded |
| `metadata` | 10 KB | Invalid JSON rejected |
| `stackTrace` | 10 KB | Truncated if exceeded |
| `errorCode` | 100 chars | Truncated if exceeded |
| `tags` | 50 items | Excess items dropped |
| `userId` | 100 chars | Truncated if exceeded |

## Log Levels

### DEBUG
- **Purpose**: Detailed diagnostic information
- **Use Cases**:
  - Variable values
  - Execution flow
  - Cache hits/misses
  - Detailed timing information
- **Example**:
  ```json
  {
    "severity": "DEBUG",
    "message": "Cache miss for key: price_123",
    "metadata": { "key": "price_123", "cache": "redis" }
  }
  ```

### INFO
- **Purpose**: General informational messages
- **Use Cases**:
  - Request lifecycle events
  - Successful operations
  - State changes
  - Configuration updates
- **Example**:
  ```json
  {
    "severity": "INFO",
    "message": "Request completed successfully",
    "metadata": { "statusCode": 200, "duration": 1234 }
  }
  ```

### WARN
- **Purpose**: Potentially harmful situations
- **Use Cases**:
  - High latency
  - Rate limit approaching
  - Deprecated API usage
  - Unusual patterns
- **Example**:
  ```json
  {
    "severity": "WARN",
    "message": "High memory usage detected",
    "metadata": { "usage": "90%", "threshold": "85%" }
  }
  ```

### ERROR
- **Purpose**: Error events that allow continuation
- **Use Cases**:
  - API failures
  - Timeout errors
  - Validation errors
  - External service failures
- **Example**:
  ```json
  {
    "severity": "ERROR",
    "message": "External API timeout",
    "metadata": {
      "errorCode": "TIMEOUT",
      "endpoint": "/api/external",
      "duration": 5000
    },
    "stackTrace": "Error: Timeout..."
  }
  ```

### CRITICAL
- **Purpose**: Critical events causing failure
- **Use Cases**:
  - Database connection failures
  - Authentication system failures
  - Complete service outages
  - Data corruption
- **Example**:
  ```json
  {
    "severity": "CRITICAL",
    "message": "Database connection failed",
    "metadata": {
      "errorCode": "CONNECTION_FAILED",
      "database": "postgres-primary"
    },
    "stackTrace": "Error: connect ECONNREFUSED..."
  }
  ```

## Tag Conventions

### Standard Tags

| Tag | Usage | Example |
|-----|-------|---------|
| `api` | API requests | Request received via REST API |
| `scheduled` | Scheduled jobs | Cron job execution |
| `webhook` | Webhook events | Incoming webhook |
| `cache-hit` | Cache successful | Data retrieved from cache |
| `cache-miss` | Cache miss | Data not in cache |
| `retry` | Retry attempt | Request being retried |
| `audit` | Audit trail | Important state changes |
| `security` | Security events | Authentication, authorization |

### Tag Examples

```json
{
  "tags": ["api", "price", "cache-hit"]
}

{
  "tags": ["scheduled", "analytics", "daily-job"]
}

{
  "tags": ["webhook", "stripe", "payment"]
}
```

## Metadata Conventions

### Request Metadata

```json
{
  "metadata": {
    "method": "POST",
    "path": "/api/price",
    "query": { "symbol": "AAPL" },
    "headers": {
      "user-agent": "Mozilla/5.0...",
      "content-type": "application/json"
    },
    "clientIp": "192.168.1.1"
  }
}
```

### Response Metadata

```json
{
  "metadata": {
    "statusCode": 200,
    "responseSize": 1024,
    "cacheUsed": true,
    "dbQueries": 5
  }
}
```

### Error Metadata

```json
{
  "metadata": {
    "errorCode": "TIMEOUT",
    "errorType": "ConnectionTimeout",
    "retryable": true,
    "attempt": 3,
    "maxAttempts": 5
  }
}
```

### Performance Metadata

```json
{
  "metadata": {
    "dbDuration": 500,
    "apiDuration": 800,
    "processingDuration": 200,
    "totalDuration": 1500
  }
}
```

## Query Examples

### Filter by Severity

```sql
SELECT *
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE severity = 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), HOUR 1)
```

### Filter by Function

```sql
SELECT *
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE function = 'omniclaw-price'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)
```

### Filter by Tag

```sql
SELECT *
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE 'api' IN UNNEST(tags)
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)
```

### Filter by User

```sql
SELECT *
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE userId = 'user_123'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)
```

### Aggregate by Function

```sql
SELECT
  function,
  COUNT(*) as requestCount,
  AVG(duration) as avgDuration,
  SUM(CASE WHEN severity = 'ERROR' THEN 1 ELSE 0 END) as errorCount
FROM `omniclaw-enhanced.omniclaw_logs.function_logs`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), DAY 1)
GROUP BY function
```

## Validation Rules

### Timestamp Validation
- Must be valid ISO 8601 format
- Must be in UTC timezone
- Cannot be in the future (allow 5 min clock skew)
- Cannot be older than 1 year for hot storage

### Severity Validation
- Must be one of: DEBUG, INFO, WARN, ERROR, CRITICAL
- Case-sensitive

### Request ID Validation
- Must be unique per request
- Recommended format: `req_<timestamp>_<random>`
- Must not contain spaces

### User ID Validation
- Can be empty string for anonymous
- Max length 100 characters
- Alphanumeric with underscores and hyphens

### Duration Validation
- Must be non-negative integer
- Max value: 3600000 (1 hour)
- Measured in milliseconds

## Migration Guide

### Version 1 to Version 2

**Removed Fields**:
- `correlationId` → Use `requestId`
- `level` → Use `severity`
- `component` → Use `function`

**Added Fields**:
- `ingestionTime` → Auto-populated by BigQuery
- `region` → GCP region

**Changed Fields**:
- `metadata` → Now JSON type (was STRING)
- `tags` → Now ARRAY<STRING> (was comma-separated STRING)

### Backward Compatibility

The log aggregator supports both v1 and v2 schemas and will automatically convert:
```javascript
// v1 format
{
  "level": "INFO",
  "component": "omniclaw-price"
}

// Automatically converted to v2
{
  "severity": "INFO",
  "function": "omniclaw-price"
}
```

## Best Practices

### DO ✅

1. **Use consistent requestId** across all logs in a request
2. **Include duration** for performance tracking
3. **Add relevant tags** for filtering
4. **Sanitize sensitive data** before logging
5. **Use appropriate severity levels**

### DON'T ❌

1. **Don't log sensitive data** (passwords, tokens)
2. **Don't log excessively large metadata** (>10KB)
3. **Don't use message for structured data**
4. **Don't include stack trace for non-errors**
5. **Don't use severity inconsistently**

## Support

For schema questions:
- Review [Logging Guide](./LOGGING_GUIDE.md)
- Check [API Documentation](./docs/API_DOCUMENTATION.md)
- Open an issue on GitHub
