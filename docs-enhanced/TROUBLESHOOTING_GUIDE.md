# OmniClaw Enhanced - Troubleshooting Guide

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Target Audience**: DevOps Engineers, Support Teams, Site Reliability Engineers
**Reading Time**: 35 minutes

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Diagnostics](#quick-diagnostics)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Error Codes Reference](#error-codes-reference)
5. [Diagnostic Procedures](#diagnostic-procedures)
6. [Emergency Procedures](#emergency-procedures)
7. [Performance Issues](#performance-issues)
8. [External API Issues](#external-api-issues)
9. [Database Issues](#database-issues)
10. [Deployment Issues](#deployment-issues)
11. [Monitoring & Alerts](#monitoring--alerts)

---

## Introduction

This troubleshooting guide provides comprehensive procedures for diagnosing and resolving issues with OmniClaw Enhanced cloud functions. Use this guide when encountering errors, performance degradation, or unexpected behavior.

### Incident Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P0 - Critical** | Complete system outage | < 15 minutes | All functions returning 500 errors |
| **P1 - High** | Major functionality broken | < 1 hour | Story generation completely down |
| **P2 - Medium** | Partial functionality affected | < 4 hours | TTS caching not working |
| **P3 - Low** | Minor issues, workarounds available | < 24 hours | Slow response on one endpoint |

### Support Escalation Path

```
1. Self-Service (This Guide)
   ↓
2. Team Chat/Slack
   ↓
3. On-Call Engineer
   ↓
4. Engineering Manager
   ↓
5. CTO/VP Engineering
```

---

## Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash
# quick-health-check.sh

echo "🔍 OmniClaw Enhanced Health Check"
echo "=================================="

# Check all functions
functions=(
  "omniclaw-price"
  "omniclaw-story"
  "omniclaw-media"
  "omniclaw-analytics"
  "omniclaw-health"
  "omniclaw-email"
)

region="us-central1"
project="omniclaw-enhanced"

for func in "${functions[@]}"; do
  echo -n "Checking $func... "

  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://$region-$project.cloudfunctions.net/$func/health")

  if [ "$status" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ FAILED (HTTP $status)"
  fi
done

echo ""
echo "📊 Recent Errors (last 5 minutes):"
gcloud logging read \
  "resource.type=cloud_function AND severity>=ERROR" \
  --freshness=5m \
  --limit=20 \
  --format="table(timestamp,severity,jsonPayload.error,resource.labels.function_name)"

echo ""
echo "✅ Health check complete!"
```

### Quick Diagnostic Commands

```bash
# 1. Check function status
gcloud functions list --regions=us-central1

# 2. View recent errors
gcloud logging read "severity>=ERROR" --limit=50 --freshness=1h

# 3. Check deployment status
gcloud functions describe omniclaw-story --region=us-central1

# 4. View active instances
gcloud functions describe omniclaw-story --region=us-central1 --format="json(activeInstances)"

# 5. Test connectivity
curl -f "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-health" || echo "Health check failed"
```

---

## Common Issues & Solutions

### Issue: "Circuit Breaker Open" Error

**Symptoms**:
```
{
  "success": false,
  "error": "Circuit breaker is open for spotify"
}
```

**Causes**:
- 5+ consecutive failures to external API
- External service (Spotify/YouTube) is down
- Network connectivity issues
- Invalid API credentials

**Solutions**:

#### 1. Wait for Automatic Reset (60 seconds)
```bash
# Check when circuit will close
date && echo "Circuit will reset in 60 seconds"
```

#### 2. Manually Reset Circuit Breaker
```javascript
// Emergency reset (requires redeployment)
// In production, this requires understanding root cause first
```

#### 3. Verify External API Status
```bash
# Test Spotify API directly
curl -X GET "https://api.spotify.com/v1/me" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test YouTube API
curl -X GET "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=YOUR_API_KEY"
```

#### 4. Check API Credentials
```bash
# Verify secrets are set
gcloud secrets list --filter="name:*spotify*"

# Access specific secret
gcloud secrets versions access latest --secret=spotify-client-secret
```

**Prevention**:
```javascript
// Implement exponential backoff
async function callWithCircuitBreaker(apiCall) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s
    }
  }
}
```

---

### Issue: Timeout Errors

**Symptoms**:
```
{
  "success": false,
  "error": "Timeout"
}
```
or
```
Error: Cloud Function execution timed out
```

**Causes**:
- Story generation taking too long (>60s)
- Price checking with slow websites
- External API delays
- Inefficient database queries

**Solutions**:

#### 1. Increase Timeout (if safe)
```yaml
# cloudbuild.yaml
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - functions
    - deploy
    - omniclaw-story
    - --gen2
    - --timeout=540s  # Increase from 60s to 540s (max)
```

#### 2. Optimize Code Performance
```javascript
// ❌ Bad: Synchronous operations
async function generateStory() {
  const segments = [];
  for (const segment of story.segments) {
    const audio = await generateTTS(segment); // Sequential
    segments.push(audio);
  }
  return segments;
}

// ✅ Good: Parallel operations
async function generateStory() {
  const audioPromises = story.segments.map(s => generateTTS(s));
  return Promise.all(audioPromises); // Parallel
}
```

#### 3. Implement Early Response Pattern
```javascript
// ✅ Good: Return early, process in background
async function handleLongRequest(req, res) {
  const taskId = uuidv4();

  // Enqueue background task
  await tasksClient.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        url: `${FUNCTION_URL}/worker`,
        body: JSON.stringify({ taskId, params: req.body })
      }
    }
  });

  // Return immediately with task ID
  return res.json({
    success: true,
    taskId,
    status: 'processing',
    checkUrl: `${FUNCTION_URL}/status/${taskId}`
  });
}
```

#### 4. Add Timeouts to External Calls
```javascript
async function withTimeout(promise, timeoutMs) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Usage
const response = await withTimeout(
  axios.get('https://slow-api.com'),
  10000 // 10 second timeout
);
```

---

### Issue: "Out of Memory" Errors

**Symptoms**:
```
Error: Cloud function execution failed due to out of memory
```

**Causes**:
- Loading large datasets into memory
- Memory leaks in code
- Concurrent instances exceeding limits
- Large story generation (2GB memory limit)

**Solutions**:

#### 1. Increase Memory Allocation
```bash
gcloud functions deploy omniclaw-story \
  --gen2 \
  --memory=2048MB  # Increase from 512MB
```

#### 2. Process Data in Chunks
```javascript
// ❌ Bad: Load all at once
async function processAllProducts() {
  const products = await getAllProducts(); // 10,000 items
  products.forEach(p => processProduct(p));
}

// ✅ Good: Process in batches
async function processAllProducts() {
  const batchSize = 100;
  let offset = 0;

  while (true) {
    const products = await getProducts(offset, batchSize);
    if (products.length === 0) break;

    await Promise.all(products.map(p => processProduct(p)));
    offset += batchSize;
  }
}
```

#### 3. Use Streaming for Large Data
```javascript
// ✅ Good: Stream processing
const fs = require('fs');
const readline = require('readline');

async function processLargeFile(filename) {
  const stream = fs.createReadStream(filename);
  const rl = readline.createInterface({ input: stream });

  for await (const line of rl) {
    await processLine(line); // Process one line at a time
  }
}
```

#### 4. Clear Caches Periodically
```javascript
// Implement cache eviction
const memoryCache = new Map();
const MAX_CACHE_SIZE = 1000;

function setCache(key, value) {
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(key, value);
}
```

---

### Issue: CORS Errors in Browser

**Symptoms**:
```
Access to fetch at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Causes**:
- Missing CORS headers
- Incorrect CORS configuration
- Custom Origin headers in request

**Solutions**:

#### 1. Verify CORS Headers in Function
```javascript
// ✅ Correct CORS setup
exports.handler = async (req, res) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', '*');

  // Your handler logic...
};
```

#### 2. Remove Custom Origin Headers
```javascript
// ❌ Bad: Setting custom Origin
fetch(url, {
  headers: {
    'Origin': 'http://localhost:3000'  // Don't do this!
  }
});

// ✅ Good: Let browser set Origin automatically
fetch(url, {
  headers: {
    'Content-Type': 'application/json'
  }
});
```

#### 3. Configure Allowed Origins for Production
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://omniclaw.app',
      'https://yourdomain.com'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
```

---

### Issue: Invalid API Key Errors

**Symptoms**:
```
{
  "success": false,
  "error": "Invalid API key"
}
```

**Causes**:
- Secret not set in Secret Manager
- Secret version mismatch
- Incorrect secret name reference
- Expired API key

**Solutions**:

#### 1. Verify Secret Exists
```bash
# List all secrets
gcloud secrets list

# Check specific secret
gcloud secrets describe anthropic-api-key

# Access secret value
gcloud secrets versions access latest --secret=anthropic-api-key
```

#### 2. Set Missing Secret
```bash
# Create new secret
echo -n "your-api-key-here" | gcloud secrets create anthropic-api-key --data-file=-

# Or update existing secret
echo -n "new-api-key-here" | gcloud secrets versions add anthropic-api-key --data-file=-
```

#### 3. Grant Function Access to Secret
```bash
# Get function service account
gcloud functions describe omniclaw-story --region=us-central1 --format="value(serviceAccountEmail)"

# Grant access
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

#### 4. Redeploy Function with Secret
```bash
gcloud functions deploy omniclaw-story \
  --gen2 \
  --region=us-central1 \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest"
```

---

### Issue: Database Connection Errors

**Symptoms**:
```
Error: Could not connect to Firestore
```

**Causes**:
- Incorrect project ID
- Missing IAM permissions
- Network connectivity issues
- Firestore emulator not running (local dev)

**Solutions**:

#### 1. Verify Project Configuration
```bash
# Check current project
gcloud config list project

# Set correct project
gcloud config set project omniclaw-enhanced
```

#### 2. Verify IAM Permissions
```bash
# Get function service account
SA_EMAIL=$(gcloud functions describe omniclaw-price --region=us-central1 --format="value(serviceAccountEmail)")

# Grant Firestore access
gcloud projects add-iam-policy-binding omniclaw-enhanced \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/datastore.user"
```

#### 3. Test Firestore Connection
```javascript
// Test connection script
const admin = require('firebase-admin');

async function testFirestoreConnection() {
  try {
    const db = admin.firestore();
    const testDoc = await db.collection('test').doc('connection').get();
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    return false;
  }
}

testFirestoreConnection();
```

#### 4. Use Firestore Emulator (Local Dev)
```bash
# Start emulator
gcloud emulators firestore start --host-port=localhost:8080

# Set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080

# Verify connection
curl http://localhost:8080/v1/projects/omniclaw-enhanced/databases/(default)/documents
```

---

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | Common Cause | Action |
|------|---------|--------------|--------|
| **200** | Success | Request completed successfully | None |
| **204** | No Content | CORS preflight request | None |
| **400** | Bad Request | Invalid request format | Fix request body |
| **401** | Unauthorized | Missing/invalid API key | Check authentication |
| **403** | Forbidden | Insufficient permissions | Check IAM roles |
| **404** | Not Found | Invalid endpoint URL | Verify function URL |
| **405** | Method Not Allowed | Wrong HTTP method | Use POST instead of GET |
| **429** | Too Many Requests | Rate limit exceeded | Implement backoff |
| **500** | Server Error | Internal function error | Check logs |
| **503** | Service Unavailable | Circuit breaker open | Wait or reset |
| **504** | Gateway Timeout | Request timeout | Increase timeout or optimize |

### Custom Error Messages

| Error | Code | Cause | Solution |
|-------|------|-------|----------|
| **Unknown request type** | ERR_001 | Invalid requestType value | Use valid request type |
| **Missing required parameter** | ERR_002 | Required field not provided | Check API documentation |
| **Invalid URL format** | ERR_003 | Malformed URL | Verify URL structure |
| **text is required for TTS** | ERR_004 | Missing text parameter | Include text in params |
| **Circuit breaker open** | ERR_005 | Too many failures | Wait 60s or investigate |
| **Unsupported platform** | ERR_006 | Invalid platform name | Use spotify/youtube/fen/kodi |
| **Invalid character** | ERR_007 | Unknown character voice | Use valid character |
| **Invalid emotion** | ERR_008 | Unknown emotion type | Use valid emotion |
| **Story generation failed** | ERR_009 | LLM provider error | Try fallback provider |
| **TTS generation failed** | ERR_010 | TTS provider error | Check API keys |
| **Price scraping failed** | ERR_011 | Website blocking | Use alternative scraper |
| **Media not found** | ERR_012 | Invalid media ID | Verify media ID |
| **Device not active** | ERR_013 | No active Spotify device | Check Spotify app |
| **Rate limit exceeded** | ERR_014 | Too many requests | Implement backoff |
| **Timeout** | ERR_015 | Request took too long | Optimize code or increase timeout |

---

## Diagnostic Procedures

### Procedure 1: Full System Diagnosis

```bash
#!/bin/bash
# full-diagnosis.sh

echo "🔍 OmniClaw Enhanced Full Diagnosis"
echo "===================================="
echo ""

# 1. Check Function Status
echo "📋 Function Status:"
gcloud functions list --regions=us-central1 --format="table(name,status,updateTime)"
echo ""

# 2. Check Recent Errors
echo "❌ Recent Errors (Last Hour):"
gcloud logging read \
  "resource.type=cloud_function AND severity>=ERROR" \
  --freshness=1h \
  --limit=50 \
  --format="table(timestamp,jsonPayload.error,resource.labels.function_name)"
echo ""

# 3. Check Error Rates
echo "📊 Error Rate by Function:"
for func in omniclaw-price omniclaw-story omniclaw-media; do
  errors=$(gcloud logging read \
    "resource.type=cloud_function AND resource.labels.function_name=$func AND severity>=ERROR" \
    --freshness=1h --format="value(severity)" | wc -l)

  requests=$(gcloud logging read \
    "resource.type=cloud_function AND resource.labels.function_name=$func" \
    --freshness=1h --format="value(severity)" | wc -l)

  if [ $requests -gt 0 ]; then
    rate=$(echo "scale=2; $errors * 100 / $requests" | bc)
    echo "$func: $errors errors / $requests requests ($rate%)"
  fi
done
echo ""

# 4. Check Latency
echo "⏱️  Average Latency by Function:"
for func in omniclaw-price omniclaw-story omniclaw-media; do
  latency=$(gcloud logging read \
    "resource.type=cloud_function AND resource.labels.function_name=$func AND jsonPayload.latency" \
    --freshness=1h --format="value(jsonPayload.latency)" | \
    awk '{sum+=$1; count++} END {if(count>0) print sum/count "ms"; else print "N/A"}')
  echo "$func: $latency"
done
echo ""

# 5. Check External API Status
echo "🌐 External API Status:"
echo -n "Anthropic API: "
if curl -sf -o /dev/null "https://api.anthropic.com/v1/messages"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

echo -n "Spotify API: "
if curl -sf -o /dev/null "https://api.spotify.com/v1"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

echo -n "YouTube API: "
if curl -sf -o /dev/null "https://www.googleapis.com/youtube/v3/search"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi
echo ""

# 6. Check Database Status
echo "💾 Database Status:"
echo "Firestore: "
if gcloud firestore databases list --format="value(name)" | grep -q "(default)"; then
  echo "✅ OK"
else
  echo "❌ NOT FOUND"
fi
echo ""

# 7. Check Secrets
echo "🔐 Secrets Status:"
gcloud secrets list --format="table(name,createTime)" | grep -E "(NAME|anthropic|elevenlabs|spotify|youtube)"
echo ""

# 8. Check Memory Usage
echo "💾 Memory Usage:"
for func in omniclaw-price omniclaw-story omniclaw-media; do
  mem=$(gcloud functions describe $func --region=us-central1 --format="value(memorySize)")
  echo "$func: $mem"
done
echo ""

echo "✅ Diagnosis complete!"
```

### Procedure 2: Function-Specific Diagnosis

#### Price Tracking Function
```bash
# Check price function health
curl -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "getTracked", "userId": "test-user"}'

# Check Cloud Tasks queue
gcloud tasks queues describe price-check-queue --location=us-central1

# Check recent price checks
gcloud logging read \
  "resource.labels.function_name=omniclaw-price AND jsonPayload.action=checkPrice" \
  --limit=20 --freshness=1h
```

#### Story Generation Function
```bash
# Test story generation
curl -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "generateStory", "params": {"genre": "fantasy", "duration": "short"}}'

# Test TTS
curl -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "textToSpeech", "params": {"text": "Test", "character": "narrator"}}'

# Check LLM provider status
gcloud logging read \
  "resource.labels.function_name=omniclaw-story AND jsonPayload.provider" \
  --limit=20 --freshness=1h
```

#### Media Control Function
```bash
# Test Spotify search
curl -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "search", "platform": "spotify", "params": {"query": "test"}}'

# Check circuit breaker status
gcloud logging read \
  "resource.labels.function_name=omniclaw-media AND jsonPayload.circuitBreaker" \
  --limit=20 --freshness=10m
```

---

## Emergency Procedures

### Emergency 1: Complete System Outage

**Symptoms**: All functions returning 500 errors or timeouts

**Immediate Actions**:

1. **Verify GCP Status**
```bash
# Check GCP status page
open "https://status.cloud.google.com/"

# Check region status
gcloud compute regions describe us-central1
```

2. **Check Function Status**
```bash
gcloud functions list --regions=us-central1 --filter="status:!=ACTIVE"
```

3. **Review Recent Deployments**
```bash
gcloud functions list --regions=us-central1 --format="table(name,updateTime)" | sort -k2
```

4. **Check Recent Changes**
```bash
git log --since="1 hour ago" --oneline
```

5. **Rollback if Necessary**
```bash
./rollback.sh omniclaw-story
```

### Emergency 2: API Key Compromised

**Symptoms**: Unexpected charges, unauthorized access

**Immediate Actions**:

1. **Rotate All API Keys**
```bash
# Anthropic
echo -n "new-key" | gcloud secrets versions add anthropic-api-key --data-file=-

# ElevenLabs
echo -n "new-key" | gcloud secrets versions add elevenlabs-api-key --data-file=-

# Spotify
echo -n "new-key" | gcloud secrets versions add spotify-client-secret --data-file=-
```

2. **Redeploy All Functions**
```bash
npm run deploy:all
```

3. **Review Access Logs**
```bash
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.error='Invalid API key'" \
  --limit=100 --freshness=24h
```

### Emergency 3: Data Corruption

**Symptoms**: Incorrect data, missing records

**Immediate Actions**:

1. **Stop All Writes**
```bash
# Disable functions temporarily
gcloud functions deploy omniclaw-price --no-allow-unauthenticated
```

2. **Export Current Data**
```bash
gcloud firestore export gs://omniclaw-backups/emergency-$(date +%Y%m%d)
```

3. **Identify Corrupted Data**
```javascript
// Run validation script
node scripts/validate-data.js
```

4. **Restore from Backup** (if needed)
```bash
gcloud firestore import gs://omniclaw-backups/backup-20260326
```

---

## Performance Issues

### Issue: Slow Cold Starts

**Diagnosis**:
```bash
# Check cold start times
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.coldStart=true" \
  --limit=50 --freshness=1h --format="table(timestamp,jsonPayload.coldStartDuration,resource.labels.function_name)"
```

**Solutions**:
```javascript
// 1. Lazy load dependencies
let heavyLibrary;
async function getHeavyLibrary() {
  if (!heavyLibrary) {
    heavyLibrary = await import('heavy-library');
  }
  return heavyLibrary;
}

// 2. Minimize global scope code
// ❌ Bad
const data = loadHugeData(); // Runs on cold start

// ✅ Good
let data;
async function getData() {
  if (!data) {
    data = await loadHugeData();
  }
  return data;
}

// 3. Use Gen 2 functions
gcloud functions deploy omniclaw-story --gen2
```

### Issue: High Memory Usage

**Diagnosis**:
```bash
# Check memory usage
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.maxMemoryUsed" \
  --limit=50 --freshness=1h --format="table(timestamp,jsonPayload.maxMemoryUsed,resource.labels.function_name)"
```

**Solutions**:
```javascript
// 1. Stream large data
const stream = require('stream');

// 2. Process in chunks
async function processInBatches(items, batchSize) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processBatch(batch);
  }
}

// 3. Clear caches
function clearCache() {
  memoryCache.clear();
  global.gc && global.gc(); // Force garbage collection
}
```

---

## External API Issues

### Issue: Anthropic API Rate Limiting

**Symptoms**:
```
Error: Rate limit exceeded for Anthropic API
```

**Solutions**:
```javascript
// 1. Implement exponential backoff
async function callAnthropicWithBackoff(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        messages: [{ role: "user", content: prompt }]
      });
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// 2. Use fallback provider
async function generateWithFallback(prompt) {
  try {
    return await callAnthropic(prompt);
  } catch (error) {
    if (error.status === 429) {
      console.log('Anthropic rate limited, falling back to Groq');
      return await callGroq(prompt);
    }
    throw error;
  }
}
```

### Issue: Spotify API Token Expired

**Symptoms**:
```
Error: The access token expired
```

**Solutions**:
```javascript
// 1. Implement token refresh
async function getSpotifyToken() {
  const cached = await redis.get('spotify:token');
  if (cached) return cached;

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    `grant_type=client_credentials`,
    {
      auth: {
        username: SPOTIFY_CLIENT_ID,
        password: SPOTIFY_CLIENT_SECRET
      }
    }
  );

  const token = response.data.access_token;
  await redis.setex('spotify:token', 3600, token);
  return token;
}

// 2. Auto-refresh on 401
async function callSpotify(endpoint) {
  const token = await getSpotifyToken();

  try {
    return await axios.get(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    if (error.response?.status === 401) {
      await redis.del('spotify:token');
      return callSpotify(endpoint); // Retry with new token
    }
    throw error;
  }
}
```

---

## Database Issues

### Issue: Firestore Slow Queries

**Diagnosis**:
```bash
# Check slow queries
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.queryDuration" \
  --limit=50 --freshness=1h --format="table(timestamp,jsonPayload.queryDuration,jsonPayload.query,resource.labels.function_name)"
```

**Solutions**:
```javascript
// 1. Create composite indexes
// Create index in Firestore console: products_(userId, active, lastChecked)

// 2. Use more selective queries
// ❌ Bad: Fetches all data
const products = await db.collection('products').get();

// ✅ Good: Specific query
const products = await db.collection('products')
  .where('userId', '==', userId)
  .where('active', '==', true)
  .limit(50)
  .get();

// 3. Use pagination
async function getProductsPaginated(userId, pageSize = 50) {
  let query = db.collection('products')
    .where('userId', '==', userId)
    .orderBy('lastChecked')
    .limit(pageSize);

  const products = [];
  let snapshot = await query.get();

  while (snapshot.docs.length > 0) {
    products.push(...snapshot.docs.map(doc => doc.data()));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = query.startAfter(lastDoc);
    snapshot = await query.get();
  }

  return products;
}
```

---

## Deployment Issues

### Issue: Deployment Fails

**Symptoms**:
```
ERROR: (gcloud.functions.deploy) OperationError: code=3, message=Build failed
```

**Solutions**:
```bash
# 1. Check build logs
gcloud builds list --limit=5

# 2. View specific build log
gcloud builds log BUILD_ID

# 3. Common issues:
# - package.json has errors → Run npm install
# - Dependencies missing → Check package.json
# - Node version mismatch → Use Node 18+

# 4. Test locally first
npm run test:unit
npm run lint
```

### Issue: Deployment Slow

**Solutions**:
```bash
# 1. Use smaller deployment package
echo "node_modules/" >> .gcloudignore

# 2. Parallel deployments
npm run deploy:price &
npm run deploy:story &
npm run deploy:media &
wait
```

---

## Monitoring & Alerts

### Setting Up Alerts

```bash
# Create alert policy for error rate
gcloud alpha monitoring policies create --policy-from-file=monitoring/error-rate-policy.yaml

# Create alert policy for latency
gcloud alpha monitoring policies create --policy-from-file=monitoring/latency-policy.yaml

# Create alert for circuit breaker
gcloud alpha monitoring policies create --policy-from-file=monitoring/circuit-breaker-policy.yaml
```

### Monitoring Dashboards

```yaml
# monitoring/dashboard.yaml
displayName: OmniClaw Enhanced Dashboard
gridLayout:
  widgets:
    - title: Error Rate by Function
      logsPanel:
        logFilter: "resource.type=cloud_function AND severity>=ERROR"
        resourceNames:
          - projects/omniclaw-enhanced

    - title: Request Count by Function
      timeSeriesTable:
        timeSeriesQuery:
          timeSeriesFilter:
            filter: "resource.type=cloud_function"
            aggregation:
              alignments:
                - alignmentPeriod: 300s
                  perSeriesAligner: ALIGN_RATE
    - title: Average Latency by Function
      scorecard:
        timeSeriesQuery:
          timeSeriesFilter:
            filter: "resource.type=cloud_function AND jsonPayload.latency"
            aggregation:
              perSeriesAligner: ALIGN_MEAN
```

---

## Appendix

### A. Useful Scripts

```bash
# Monitor errors in real-time
gcloud logging tail "resource.type=cloud_function AND severity>=ERROR"

# Check function metrics
gcloud functions describe omniclaw-story --region=us-central1 --format=json

# Export logs for analysis
gcloud logging read "resource.type=cloud_function" --freshness=1h --format=json > logs.json

# Test all functions
./quick-health-check.sh
```

### B. Emergency Contacts

- **On-Call Engineer**: [Phone/Slack]
- **Engineering Manager**: [Email]
- **CTO**: [Email]

### C. Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Developer onboarding
- [DEPLOYMENT_PLAYBOOK.md](./DEPLOYMENT_PLAYBOOK.md) - Deployment procedures
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference

---

**Document Version**: 1.0.0
**Last Updated**: 2026-03-27
**Maintained By**: OmniClaw Operations Team
**Next Review**: 2026-04-27
