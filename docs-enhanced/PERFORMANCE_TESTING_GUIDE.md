# OmniClaw Enhanced - Performance Testing Guide

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Reading Time**: 8 minutes

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Test Configuration](#test-configuration)
5. [SLA Targets](#sla-targets)
6. [Understanding Results](#understanding-results)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The OmniClaw Enhanced Performance Testing Suite provides comprehensive load testing for all three cloud functions:

- **omniclaw-price** - Price tracking with alerts
- **omniclaw-story** - AI story generation with TTS
- **omniclaw-media** - Unified media control

### Key Features

✅ **Concurrent Load Testing** - Simulate 20+ concurrent users
✅ **Ramp-up Support** - Gradually increase load over time
✅ **Warmup Phase** - Handle cold starts automatically
✅ **Percentile Metrics** - P50, P95, P99 latency reporting
✅ **SLA Validation** - Automatic performance target checking
✅ **HTML Reports** - Beautiful, interactive performance dashboards
✅ **Error Tracking** - Detailed error analysis and categorization
✅ **Cold Start Detection** - Measure function initialization time

---

## Prerequisites

### Required Tools

✅ **Node.js** (v14 or higher)
```bash
node --version  # Should be v14+
```

✅ **npm** (comes with Node.js)
```bash
npm --version
```

✅ **Internet Connection**
- Tests run against production cloud functions
- Requires outbound HTTPS access

### Optional Tools

📊 **Google Cloud Monitoring** - For production metrics
```bash
gcloud auth login
```

---

## Quick Start

### 1. Run Full Performance Test Suite

```bash
cd /Users/Subho/omniclaw-enhanced
./performance-test.sh
```

**This will:**
- Test all 3 functions (price, story, media)
- Run 20 concurrent requests for 60 seconds
- Generate HTML report with metrics
- Save results to `/tmp/performance-results/run_TIMESTAMP/`

### 2. Run Individual Function Tests

**Test Price Tracking:**
```bash
node tests/performance/load-test-runner.js \
  --url="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  --concurrency=20 \
  --duration=60 \
  --output=/tmp/price-test.json
```

**Test Story Generation:**
```bash
node tests/performance/load-test-runner.js \
  --url="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story" \
  --concurrency=20 \
  --duration=60 \
  --output=/tmp/story-test.json
```

**Test Media Control:**
```bash
node tests/performance/load-test-runner.js \
  --url="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media" \
  --concurrency=20 \
  --duration=60 \
  --output=/tmp/media-test.json
```

### 3. View Results

**Open HTML Report:**
```bash
open /tmp/performance-results/run_*/performance_report.html
```

**View JSON Results:**
```bash
cat /tmp/performance-results/run_*/performance_summary.json | jq
```

---

## Test Configuration

### Command-Line Options

```bash
node tests/performance/load-test-runner.js \
  --url=<FUNCTION_URL> \
  --concurrency=<NUMBER> \
  --duration=<SECONDS> \
  --rampup=<SECONDS> \
  --output=<PATH>
```

| Option | Default | Description |
|--------|---------|-------------|
| `--url` | Required | Cloud Function URL to test |
| `--concurrency` | 20 | Number of concurrent requests |
| `--duration` | 60 | Test duration in seconds |
| `--rampup` | 30 | Time to reach full concurrency |
| `--output` | performance-results.json | Output file path |

### Example Configurations

**Light Load Test (Quick Check):**
```bash
node tests/performance/load-test-runner.js \
  --url="$PRICE_URL" \
  --concurrency=5 \
  --duration=30 \
  --rampup=10
```

**Heavy Load Test (Stress Test):**
```bash
node tests/performance/load-test-runner.js \
  --url="$PRICE_URL" \
  --concurrency=50 \
  --duration=120 \
  --rampup=60
```

**Sustained Load Test (Endurance):**
```bash
node tests/performance/load-test-runner.js \
  --url="$PRICE_URL" \
  --concurrency=20 \
  --duration=300 \
  --rampup=30
```

---

## SLA Targets

### Performance Benchmarks

| Metric | Target | Purpose |
|--------|--------|---------|
| **P50 Latency** | < 500ms | Median response time |
| **P95 Latency** | < 2000ms | 95th percentile (critical) |
| **P99 Latency** | < 5000ms | 99th percentile (tail) |
| **Success Rate** | > 99% | Request completion rate |
| **Error Rate** | < 1% | Request failure rate |

### Why These Targets?

- **P50 < 500ms**: Median user experience should feel snappy
- **P95 < 2000ms**: 95% of users get responses within 2 seconds
- **P99 < 5000ms**: Even worst-case scenarios complete within 5 seconds
- **99% Success**: High reliability for production workloads

### Per-Function Expectations

**omniclaw-price:**
- Expected P50: 200-400ms (simple database operations)
- Expected P95: 800-1500ms (including web scraping)
- Cold starts: 2-4 seconds

**omniclaw-story:**
- Expected P50: 500-1500ms (TTS generation)
- Expected P95: 2000-4000ms (longer text processing)
- Cold starts: 3-6 seconds

**omniclaw-media:**
- Expected P50: 100-300ms (API calls to Spotify/YouTube)
- Expected P95: 500-1200ms (network operations)
- Cold starts: 1-3 seconds

---

## Understanding Results

### Test Output

```
🚀 OmniClaw Enhanced - Load Test Runner
═════════════════════════════════════════
Function URL: https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price
Concurrency: 20
Duration: 60s
Ramp-up: 30s

🔥 Warmup Phase:
   Sending 5 warmup requests...
   ✓ Warmup complete: 5/5 successful

⚡ Load Test Phase:
   Concurrency: 20 requests
   Duration: 60 seconds
   Ramp-up: 30 seconds

   [5s] Users: 4 | RPS: 3.2 | Success: 100.0% | Avg Latency: 245ms
   [10s] Users: 7 | RPS: 6.8 | Success: 100.0% | Avg Latency: 289ms
   [15s] Users: 11 | RPS: 10.4 | Success: 99.5% | Avg Latency: 312ms
   ...

📊 Performance Test Results:
═════════════════════════════════════════

Total Requests:     1147
Successful:         1142
Failed:             5
Success Rate:       99.56%
Duration:           60.00s
Throughput:         19.12 req/sec

🎯 Latency Metrics:
─────────────────────────────────────────
Min:                124ms
Max:                4231ms
Mean:               312.45ms
P50 (Median):       287ms
P95:                892ms ✓ (SLA: < 2000ms)
P99:                1876ms ✓ (SLA: < 5000ms)
P99.9:              4123ms

🎯 SLA Compliance:
─────────────────────────────────────────
P50 < 500ms:        ✓ PASS (287ms)
P95 < 2000ms:       ✓ PASS (892ms)
P99 < 5000ms:       ✓ PASS (1876ms)

Overall:            ✓ ALL SLAs PASSED

💾 Results saved to: /tmp/price-test.json
```

### HTML Report Sections

1. **Summary Cards**
   - Total Requests sent
   - Success Rate achieved
   - Average Latency (P50)
   - SLA Compliance count

2. **Function Details**
   - Per-function metrics
   - SLA pass/fail status
   - Detailed percentiles
   - Throughput measurements

3. **SLA Summary**
   - Clear pass/fail indicators
   - Comparison against targets
   - Color-coded results

---

## Advanced Usage

### Custom Test Scenarios

Create custom test scenarios in `load-test-runner.js`:

```javascript
const scenarios = {
  'my-custom-test': {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      requestType: 'customRequest',
      params: { /* your params */ }
    }
  }
};
```

### Automated CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Performance Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Run Performance Tests
        run: |
          ./performance-test.sh

      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: performance-results
          path: /tmp/performance-results/
```

### Performance Regression Detection

**Baseline Comparison Script:**

```bash
# Save baseline
node tests/performance/load-test-runner.js \
  --url="$PRICE_URL" \
  --output=/tmp/baseline.json

# Compare against baseline
node tests/performance/compare-results.js \
  --baseline=/tmp/baseline.json \
  --current=/tmp/current.json
```

### Continuous Monitoring

**Run tests periodically:**

```bash
# Every hour in cron
0 * * * * cd /Users/Subho/omniclaw-enhanced && ./performance-test.sh
```

---

## Troubleshooting

### Common Issues

#### ❌ Issue: "ECONNREFUSED" errors

**Cause**: Function URL is incorrect or function is not deployed

**Solution**:
```bash
# Verify function is deployed
gcloud functions list

# Test function manually
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health

# Check function logs
gcloud functions logs read omniclaw-price --limit 50
```

#### ❌ Issue: High latency (> 10 seconds)

**Cause**: Cold starts or external API issues

**Solution**:
```bash
# Increase warmup requests
node tests/performance/load-test-runner.js \
  --url="$URL" \
  --concurrency=20 \
  --warmup=10  # More warmup requests

# Check external API status
# - For price: Check Amazon/Flipkart availability
# - For story: Check ElevenLabs API status
# - For media: Check Spotify/YouTube API status
```

#### ❌ Issue: Low success rate (< 95%)

**Cause**: Rate limiting, API quota exceeded, or network issues

**Solution**:
```bash
# Check error details in JSON output
cat /tmp/results.json | jq '.errors'

# Reduce concurrency
node tests/performance/load-test-runner.js \
  --url="$URL" \
  --concurrency=10  # Reduce from 20

# Add delays between requests
# (Modify load-test-runner.js to add delays)
```

#### ❌ Issue: "ETIMEDOUT" errors

**Cause**: Request timeout exceeded

**Solution**:
```bash
# The test uses 60-second timeout by default
# For long-running operations (like story generation), this is normal
# Check if function actually completed by checking logs

gcloud functions logs read omniclaw-story --limit 100
```

### Debug Mode

**Enable verbose logging:**

```javascript
// In load-test-runner.js, add:
console.log('Request:', { url, data });
console.log('Response:', { status, data, latency });
```

**Check individual request details:**

```bash
# View error details
cat /tmp/results.json | jq '.errors[:5]'
```

---

## Best Practices

### 1. Run Tests Regularly

✅ **Before Deployments** - Catch regressions early
✅ **After Changes** - Verify performance impact
✅ **Scheduled Runs** - Monitor production health
✅ **Capacity Planning** - Before high-traffic events

### 2. Baseline Management

```bash
# Create baseline for each environment
./performance-test.sh  # Development
./performance-test.sh  # Staging
./performance-test.sh  # Production

# Store baselines
cp /tmp/performance-results/run_*/performance_summary.json \
   baselines/production-$(date +%Y%m%d).json
```

### 3. Test Different Scenarios

**Light Load:**
- Concurrency: 5
- Duration: 30s
- Use case: Normal traffic

**Medium Load:**
- Concurrency: 20
- Duration: 60s
- Use case: Peak hours

**Heavy Load:**
- Concurrency: 50
- Duration: 120s
- Use case: Flash sales, viral content

**Sustained Load:**
- Concurrency: 20
- Duration: 300s (5 min)
- Use case: Endurance testing

### 4. Monitor External Dependencies

Performance depends on external services:

**omniclaw-price:**
- Amazon/Flipkart scraping latency
- Firestore database performance
- Network latency to e-commerce sites

**omniclaw-story:**
- ElevenLabs API response time
- Claude API response time (for story generation)
- TTS processing time

**omniclaw-media:**
- Spotify Web API latency
- YouTube API latency
- Network performance

### 5. Alert on SLA Violations

```bash
# Add to performance-test.sh after tests complete
P95_LATENCY=$(jq '.tests[0].metrics.p95' /tmp/performance-results/run_*/performance_summary.json)

if (( $(echo "$P95_LATENCY > 2000" | bc -l) )); then
  echo "⚠️ SLA VIOLATION: P95 latency is ${P95_LATENCY}ms"
  # Send alert (email, Slack, PagerDuty, etc.)
fi
```

### 6. Document Performance Trends

```bash
# Track performance over time
mkdir -p performance-history

./performance-test.sh
cp /tmp/performance-results/run_*/performance_summary.json \
   performance-history/$(date +%Y%m%d-%H%M%S).json

# Generate trend report
node tests/performance/trend-analysis.js \
  --history=performance-history/*.json
```

---

## Quick Reference

### Essential Commands

```bash
# Run all tests
./performance-test.sh

# Test single function
node tests/performance/load-test-runner.js --url="$URL"

# View latest results
open /tmp/performance-results/run_*/performance_report.html

# Compare with baseline
diff baselines/baseline.json /tmp/current.json

# Check for SLA violations
cat /tmp/results.json | jq '.tests[].slaCompliance'
```

### SLA Targets Quick Reference

| Metric | Target | Status Check |
|--------|--------|--------------|
| P50 | < 500ms | Median response time |
| P95 | < 2000ms | 95% of requests |
| P99 | < 5000ms | 99% of requests |
| Success | > 99% | Uptime target |

### Result File Locations

```
/tmp/performance-results/
└── run_TIMESTAMP/
    ├── omniclaw-price_results.json
    ├── omniclaw-story_results.json
    ├── omniclaw-media_results.json
    ├── performance_summary.json
    └── performance_report.html
```

---

## Support

### Getting Help

📖 **Documentation**
- Full API docs: `API_DOCUMENTATION.md`
- Deployment guide: `DEPLOYMENT_AUTOMATION_GUIDE.md`
- Quick start: `QUICK_START.md`

🔍 **Debugging**
- Check Cloud Function logs: `gcloud functions logs read`
- View test results: Open HTML report
- Check error details: JSON output files

📊 **Monitoring**
- Google Cloud Monitoring dashboards
- Cloud Function metrics in GCP Console
- Custom logging in Winston format

---

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Test Suite**: OmniClaw Enhanced Performance Testing
**Status**: ✅ Ready for production use

---

**Generated by Claude Code**
**Project**: OmniClaw Enhanced
**Purpose**: Comprehensive performance testing for cloud functions
