# Performance Testing - Quick Reference Card

**Version**: 1.0.0 | **Last Updated**: 2026-03-27

---

## 🚀 Quick Start

```bash
# Run all performance tests
./performance-test.sh

# Test single function
node tests/performance/load-test-runner.js --url="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price"

# View results
open /tmp/performance-results/run_*/performance_report.html
```

---

## 📋 SLA Targets

| Metric | Target | Purpose |
|--------|--------|---------|
| **P50** | < 500ms | Median latency |
| **P95** | < 2000ms | 95th percentile (CRITICAL) |
| **P99** | < 5000ms | 99th percentile |
| **Success** | > 99% | Uptime target |

---

## 🔧 Test Configurations

| Scenario | Concurrency | Duration | Use Case |
|----------|-------------|----------|----------|
| **Light** | 5 | 30s | Quick smoke test |
| **Normal** | 20 | 60s | Standard load test |
| **Heavy** | 50 | 120s | Stress test |
| **Endurance** | 20 | 300s | Sustained load |

---

## 📊 Function URLs

```bash
PRICE_URL="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price"
STORY_URL="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story"
MEDIA_URL="https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media"
```

---

## 🎯 Expected Performance

### omniclaw-price
- P50: 200-400ms
- P95: 800-1500ms
- Cold start: 2-4s

### omniclaw-story
- P50: 500-1500ms
- P95: 2000-4000ms
- Cold start: 3-6s

### omniclaw-media
- P50: 100-300ms
- P95: 500-1200ms
- Cold start: 1-3s

---

## 📁 Result Files

```
/tmp/performance-results/run_TIMESTAMP/
├── omniclaw-price_results.json
├── omniclaw-story_results.json
├── omniclaw-media_results.json
├── performance_summary.json
└── performance_report.html
```

---

## 🔍 Common Commands

### Run Tests
```bash
./performance-test.sh                              # All functions
node tests/performance/load-test-runner.js --url="$PRICE_URL"  # Single
```

### View Results
```bash
open /tmp/performance-results/run_*/performance_report.html  # HTML
cat /tmp/performance-results/run_*/performance_summary.json | jq   # JSON
```

### Compare Results
```bash
node tests/performance/trend-analysis.js --compare baseline.json current.json
```

### Check SLA Compliance
```bash
cat /tmp/results.json | jq '.tests[].slaCompliance'
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| ECONNREFUSED | Check function URL and deployment status |
| High latency | Increase warmup requests, check cold starts |
| Low success rate | Reduce concurrency, check API quotas |
| ETIMEDOUT | Normal for long-running ops (story generation) |

---

## 📈 Monitoring

### Daily Performance Check
```bash
# Add to crontab: 0 2 * * * (daily at 2 AM)
cd /Users/Subho/omniclaw-enhanced && ./performance-test.sh
```

### Baseline Management
```bash
# Create baseline
./performance-test.sh
cp /tmp/performance-results/run_*/performance_summary.json baselines/baseline.json

# Compare against baseline
node tests/performance/trend-analysis.js baselines/baseline.json /tmp/current.json
```

---

## 🎨 HTML Report Sections

1. **Summary Cards** - Total requests, success rate, avg latency, SLA compliance
2. **Function Details** - Per-function metrics with SLA pass/fail
3. **Latency Metrics** - Min, Max, Mean, P50, P95, P99, P99.9
4. **Throughput** - Requests per second
5. **Error Summary** - Error types and occurrences

---

## 📞 Quick Help

```bash
# Full documentation
cat PERFORMANCE_TESTING_GUIDE.md

# Check function health
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health

# View function logs
gcloud functions logs read omniclaw-price --limit 50
```

---

## ✅ Pre-Test Checklist

- [ ] Functions deployed and accessible
- [ ] Network connectivity available
- [ ] External APIs operational (Amazon, ElevenLabs, Spotify)
- [ ] Sufficient time allocated (2-5 minutes for full suite)
- [ ] Results directory writable (/tmp/performance-results/)

---

## 🎯 Success Criteria

✅ **All SLAs Passed**: P95 < 2000ms, P99 < 5000ms
✅ **High Success Rate**: > 99% requests completed
✅ **Low Error Rate**: < 1% failures
✅ **Stable Performance**: No significant latency spikes

---

**Version**: 1.0.0
**Status**: ✅ Ready for production
**Documentation**: [PERFORMANCE_TESTING_GUIDE.md](./PERFORMANCE_TESTING_GUIDE.md)
