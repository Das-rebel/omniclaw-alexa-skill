# Performance Profiling Guide for OmniClaw Enhanced

Comprehensive guide to profiling and optimizing OmniClaw Enhanced performance.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Profiling Strategies](#profiling-strategies)
3. [Understanding Metrics](#understanding-metrics)
4. [Common Performance Issues](#common-performance-issues)
5. [Optimization Techniques](#optimization-techniques)
6. [Production Profiling](#production-profiling)
7. [Case Studies](#case-studies)
8. [Best Practices](#best-practices)

## Getting Started

### Installation

```bash
cd /Users/Subho/omniclaw-enhanced/profiler
npm install
```

### Basic Setup

```javascript
const { FunctionProfiler, CPUProfiler, MemoryProfiler, AsyncProfiler } = require('./profiler');

// Initialize profilers
const fnProfiler = new FunctionProfiler({ sampleRate: 1.0 });
const cpuProfiler = new CPUProfiler({ duration: 30000 });
const memProfiler = new MemoryProfiler({ sampleInterval: 5000 });
const asyncProfiler = new AsyncProfiler({ trackEventLoop: true });
```

## Profiling Strategies

### Strategy 1: Development Profiling

**Goal**: Identify performance issues during development

**Approach**:
- Use 100% sampling
- Profile individual functions
- Generate flame graphs
- Analyze bottlenecks

```javascript
// Example: Profile a specific function
const profiledFunction = fnProfiler.profile('processVoiceCommand', async (audio) => {
  // Your function logic
});

// Execute multiple times
for (let i = 0; i < 100; i++) {
  await profiledFunction(testAudio);
}

// Get statistics
const stats = fnProfiler.getFunctionStats('processVoiceCommand');
console.log('Average time:', stats.avgTime);
console.log('P95 time:', stats.p95);
console.log('Memory delta:', stats.memoryUsage.avgHeapUsed);
```

### Strategy 2: Load Testing Profiling

**Goal**: Understand performance under load

**Approach**:
- Use 10-50% sampling
- Profile for longer durations
- Simulate production traffic
- Monitor resource usage

```javascript
// Start all profilers
fnProfiler.enable();
cpuProfiler.start();
memProfiler.start();
asyncProfiler.start();

// Run load test
await runLoadTest({
  requests: 1000,
  concurrency: 50,
  duration: 60000  // 1 minute
});

// Stop and analyze
const cpuProfile = cpuProfiler.stop();
const { leaks } = memProfiler.stop();
const asyncAnalysis = asyncProfiler.stop();

// Check for issues
if (leaks.length > 0) {
  console.error('Memory leaks detected:', leaks);
}

if (asyncAnalysis.eventLoopAnalysis.health === 'BLOCKED') {
  console.error('Event loop blocked!');
}
```

### Strategy 3: Production Profiling

**Goal**: Monitor production performance with minimal impact

**Approach**:
- Use 1-10% sampling
- Short profiling durations
- Continuous monitoring
- Alert-based profiling

```javascript
// Production-safe profiling
const prodProfiler = new FunctionProfiler({
  sampleRate: 0.01,  // 1% sampling
  maxSamples: 1000,
  overheadThreshold: 5  // 5ms overhead threshold
});

// Enable for specific function
exports.omnicloudHandler = prodProfiler.profile('omnicloudHandler', handler);

// Periodic profiling
setInterval(() => {
  const stats = prodProfiler.getFunctionStats('omnicloudHandler');
  if (stats.avgTime > 1000) {
    console.warn('High execution time detected:', stats.avgTime);
  }
}, 60000);  // Check every minute
```

## Understanding Metrics

### Execution Time Metrics

| Metric | Description | Good | Warning | Critical |
|--------|-------------|------|---------|----------|
| avgTime | Average execution time | <100ms | 100-500ms | >500ms |
| p95 | 95th percentile | <200ms | 200-1000ms | >1000ms |
| p99 | 99th percentile | <500ms | 500-2000ms | >2000ms |
| maxTime | Maximum execution time | <1000ms | 1000-5000ms | >5000ms |

### Memory Metrics

| Metric | Description | Good | Warning | Critical |
|--------|-------------|------|---------|----------|
| heapUsed | Current heap usage | <50MB | 50-100MB | >100MB |
| heapTotal | Total heap size | <100MB | 100-200MB | >200MB |
| rss | Resident set size | <100MB | 100-200MB | >200MB |
| heapGrowth | Growth over time | <1MB/min | 1-5MB/min | >5MB/min |

### CPU Metrics

| Metric | Description | Good | Warning | Critical |
|--------|-------------|------|---------|----------|
| cpuTime | CPU time percentage | <50% | 50-80% | >80% |
| hotFunctions | Number of hot functions | <5 | 5-10 | >10 |
| maxHotFunctionTime | Hottest function time | <100ms | 100-500ms | >500ms |

### Async Metrics

| Metric | Description | Good | Warning | Critical |
|--------|-------------|------|---------|----------|
| avgLag | Event loop lag | <10ms | 10-50ms | >50ms |
| blockedPercentage | Blocked time | <5% | 5-20% | >20% |
| slowOperations | Slow operations (>100ms) | 0 | 1-10 | >10 |

## Common Performance Issues

### Issue 1: N+1 Query Problem

**Symptoms**:
- High database query count
- Exponential execution time growth
- Low CPU usage but high latency

**Detection**:
```javascript
const { NPlusOneDetector } = require('./profiler/bottlenecks');

const detector = new NPlusOneDetector({
  queryThreshold: 100,
  patternThreshold: 50
});

// Detect N+1 queries
const issues = detector.detect(profileData);

if (issues.length > 0) {
  console.error('N+1 queries detected:', issues);
}
```

**Solution**:
```javascript
// Before: N+1 queries
for (const user of users) {
  const orders = await db.query('SELECT * FROM orders WHERE user_id = ?', [user.id]);
  user.orders = orders;
}

// After: Single query with JOIN
const usersWithOrders = await db.query(`
  SELECT users.*, orders.*
  FROM users
  LEFT JOIN orders ON users.id = orders.user_id
`);
```

### Issue 2: Memory Leak

**Symptoms**:
- Continuous memory growth
- OOM errors over time
- Increasing heap usage

**Detection**:
```javascript
memProfiler.start();

// ... run workload for extended period ...

const { leaks } = memProfiler.stop();

leaks.forEach(leak => {
  console.error(`${leak.type}: ${leak.message}`);
  console.error('Recommendation:', leak.recommendation);
});
```

**Solution**:
```javascript
// Before: Potential memory leak
const cache = {};
function cacheResult(key, value) {
  cache[key] = value;  // Never clears old entries
}

// After: LRU cache with size limit
const LRU = require('lru-cache');
const cache = new LRU({ max: 1000 });
function cacheResult(key, value) {
  cache.set(key, value);  // Automatically evicts old entries
}
```

### Issue 3: Event Loop Blocking

**Symptoms**:
- High event loop lag
- Slow response times
- CPU-bound operations

**Detection**:
```javascript
asyncProfiler.start();

// ... run workload ...

const analysis = asyncProfiler.stop();

if (analysis.eventLoopAnalysis.health === 'BLOCKED') {
  console.error('Event loop blocked!');
  console.error('Blocked percentage:', analysis.eventLoopAnalysis.blockedPercentage);
}
```

**Solution**:
```javascript
// Before: Blocking operation
function processLargeArray(data) {
  const result = data.map(item => {
    return heavyComputation(item);  // Blocks event loop
  });
  return result;
}

// After: Async processing
async function processLargeArray(data) {
  const chunks = chunkArray(data, 1000);
  const results = [];

  for (const chunk of chunks) {
    const chunkResults = await processChunkAsync(chunk);
    results.push(...chunkResults);

    // Allow event loop to process other tasks
    await new Promise(resolve => setImmediate(resolve));
  }

  return results;
}
```

### Issue 4: Excessive Function Calls

**Symptoms**:
- High call count for simple functions
- Low average time but high total time
- CPU usage dominated by small functions

**Detection**:
```javascript
const stats = fnProfiler.getAllStats();

for (const [name, stat] of Object.entries(stats)) {
  if (stat.callCount > 10000 && stat.avgTime < 1) {
    console.warn(`High-frequency function: ${name}`);
    console.warn(`Call count: ${stat.callCount}`);
    console.warn(`Consider: Memoization, batching, or caching`);
  }
}
```

**Solution**:
```javascript
// Before: Excessive calls
function getPrice(itemId) {
  return expensiveCalculation(itemId);
}

// After: Memoization
const memoize = require('memoizee');
const getPrice = memoize(
  function(itemId) {
    return expensiveCalculation(itemId);
  },
  { max: 1000 }
);
```

## Optimization Techniques

### Technique 1: Caching

**When to Use**:
- Expensive computations
- Repeated data fetching
- Complex calculations

**Implementation**:
```javascript
const { CachingAnalyzer } = require('./profiler/optimizer');

const analyzer = new CachingAnalyzer();
const opportunities = analyzer.analyze(profileData);

opportunities.forEach(opp => {
  console.log(`Caching opportunity: ${opp.function}`);
  console.log(`Potential savings: ${opp.savings}`);
  console.log(`Cache key: ${opp.cacheKey}`);
});
```

**Example**:
```javascript
// Add caching
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });  // 10 minutes

async function getUserProfile(userId) {
  const cached = cache.get(`user:${userId}`);
  if (cached) {
    return cached;
  }

  const profile = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  cache.set(`user:${userId}`, profile);
  return profile;
}
```

### Technique 2: Batching

**When to Use**:
- Multiple similar operations
- Database queries
- API calls

**Implementation**:
```javascript
const { BatchingAnalyzer } = require('./profiler/optimizer');

const analyzer = new BatchingAnalyzer();
const batches = analyzer.analyze(profileData);

batches.forEach(batch => {
  console.log(`Batching opportunity: ${batch.operation}`);
  console.log(`Batch size: ${batch.suggestedSize}`);
  console.log(`Potential savings: ${batch.savings}`);
});
```

**Example**:
```javascript
// Before: Individual queries
async function getUsers(userIds) {
  const users = [];
  for (const id of userIds) {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    users.push(user);
  }
  return users;
}

// After: Batch query
async function getUsers(userIds) {
  return await db.query(
    'SELECT * FROM users WHERE id IN (?)',
    [userIds]
  );
}
```

### Technique 3: Lazy Loading

**When to Use**:
- Large datasets
- Expensive initialization
- Optional data

**Implementation**:
```javascript
const { LazyLoadAnalyzer } = require('./profiler/optimizer');

const analyzer = new LazyLoadAnalyzer();
const opportunities = analyzer.analyze(profileData);

opportunities.forEach(opp => {
  console.log(`Lazy load opportunity: ${opp.resource}`);
  console.log(`Load frequency: ${opp.frequency}`);
  console.log(`Unused percentage: ${opp.unusedPercentage}`);
});
```

**Example**:
```javascript
// Before: Eager loading
async function getUserWithOrders(userId) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  user.orders = await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
  return user;
}

// After: Lazy loading
async function getUserWithOrders(userId) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

  // Lazy load orders only when accessed
  Object.defineProperty(user, 'orders', {
    get: async function() {
      if (!this._orders) {
        this._orders = await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
      }
      return this._orders;
    }
  });

  return user;
}
```

## Production Profiling

### Setup

```javascript
const { ContinuousProfiler } = require('./profiler/monitoring');

const profiler = new ContinuousProfiler({
  profileInterval: 300000,  // Profile every 5 minutes
  duration: 10000,          // 10-second profiles
  retention: 288,           // Keep 24 hours (5min * 288 = 24h)
  outputDir: '/var/log/omniclaw/profiles'
});

profiler.start();

// Export for monitoring
module.exports = profiler;
```

### Alerting

```javascript
const { AlertThresholds } = require('./profiler/monitoring');

const alerts = new AlertThresholds({
  executionTime: {
    warning: 1000,
    critical: 5000
  },
  memoryUsage: {
    warning: 100 * 1024 * 1024,
    critical: 200 * 1024 * 1024
  },
  errorRate: {
    warning: 0.05,  // 5%
    critical: 0.10  // 10%
  }
});

alerts.on('warning', (alert) => {
  console.warn('[PERFORMANCE WARNING]', alert);
  // Send to monitoring service
  sendToMonitoring(alert);
});

alerts.on('critical', (alert) => {
  console.error('[PERFORMANCE CRITICAL]', alert);
  // Send alert notification
  sendAlert(alert);
});
```

### Baseline Management

```javascript
const { BaselineManager } = require('./profiler/monitoring');

const baseline = new BaselineManager({
  baselineFile: '/var/log/omniclaw/baseline.json',
  updateInterval: 86400000,  // Daily
  samples: 100  // Use 100 samples for baseline
});

// Establish baseline
await baseline.establishBaseline(() => {
  return runStandardWorkload();
});

// Compare against baseline
const comparison = await baseline.compareWithBaseline(currentProfile);

if (comparison.regression) {
  console.error('Performance regression detected!');
  console.error('Function:', comparison.function);
  console.error('Baseline:', comparison.baselineTime);
  console.error('Current:', comparison.currentTime);
  console.error('Degradation:', comparison.degradation);
}
```

## Case Studies

### Case Study 1: Reducing Cold Start Time

**Problem**: Cold starts taking 5+ seconds

**Profiling**:
```javascript
const coldStartProfile = await profileColdStart();

// Analysis showed:
// - Module loading: 2.5s
// - Database connection: 1.5s
// - Configuration parsing: 1.0s
```

**Solution**:
```javascript
// Optimize module loading
const lazyLoad = require('import-lazy');

// Reuse database connections
const connectionPool = createConnectionPool();

// Cache configuration
const config = loadConfigOnce();

// Result: Cold start reduced to 1.2s
```

### Case Study 2: Optimizing Voice Processing

**Problem**: Voice processing taking 2+ seconds

**Profiling**:
```javascript
const voiceProfile = fnProfiler.getFunctionStats('processVoiceCommand');

// Analysis showed:
// - Speech-to-text: 1200ms
// - Intent parsing: 500ms
// - Response generation: 300ms
```

**Solution**:
```javascript
// Stream speech-to-text results
async function processVoiceCommand(audio) {
  const textStream = await speechToTextStream(audio);

  let intent;
  for await (const textChunk of textStream) {
    if (!intent) {
      intent = await parseIntent(textChunk);
    }
  }

  return generateResponse(intent);
}

// Result: Processing reduced to 800ms
```

### Case Study 3: Memory Leak Resolution

**Problem**: Memory growing continuously

**Profiling**:
```javascript
const { leaks } = memProfiler.stop();

// Leak detected in event listeners
leak = {
  type: 'SUSTAINED_GROWTH',
  heapGrowth: '25.5 MB',
  duration: '10m 0s',
  growthRate: '42.5 KB/s'
}
```

**Solution**:
```javascript
// Before: Memory leak
class EventEmitter {
  on(event, listener) {
    if (!this.listeners) {
      this.listeners = [];
    }
    this.listeners.push({ event, listener });
  }
}

// After: Proper cleanup
class EventEmitter {
  on(event, listener) {
    if (!this.listeners) {
      this.listeners = [];
    }
    this.listeners.push({ event, listener });
    return () => this.off(event, listener);  // Return cleanup function
  }

  off(event, listener) {
    this.listeners = this.listeners.filter(
      l => l.event !== event || l.listener !== listener
    );
  }
}
```

## Best Practices

### 1. Profile Early, Profile Often

- Profile during development
- Profile before and after optimizations
- Profile regularly in production
- Establish performance baselines

### 2. Use Appropriate Sampling Rates

- Development: 100% sampling
- Staging: 10-50% sampling
- Production: 1-10% sampling

### 3. Monitor Continuously

- Set up continuous profiling
- Configure alert thresholds
- Track performance trends
- Compare against baselines

### 4. Optimize Strategically

- Focus on high-impact optimizations
- Measure before and after
- Consider trade-offs
- Document optimizations

### 5. Handle Production Data Carefully

- Sanitize sensitive data
- Use sampling to reduce overhead
- Limit retention period
- Secure profile storage

### 6. Collaborate Effectively

- Share profiles with team
- Document findings
- Create optimization tickets
- Track progress

## Conclusion

Effective performance profiling is essential for maintaining a fast, efficient serverless application. By following this guide and using the OmniClaw Enhanced profiling tools, you can:

- Identify performance bottlenecks
- Detect memory leaks
- Optimize resource usage
- Improve user experience
- Reduce operational costs

Remember: Performance is a journey, not a destination. Continuous profiling and optimization are key to maintaining peak performance.