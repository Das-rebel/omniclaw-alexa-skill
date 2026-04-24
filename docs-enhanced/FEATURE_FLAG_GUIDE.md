# Feature Flag Usage Guide

Complete guide for using the Feature Flagging System in OmniClaw Enhanced

## Table of Contents

1. [Getting Started](#getting-started)
2. [Common Use Cases](#common-use-cases)
3. [Advanced Features](#advanced-features)
4. [Troubleshooting](#troubleshooting)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Getting Started

### Installation

```bash
# Install dependencies
npm install @google-cloud/firestore axios

# Set environment variables
export FEATURE_FLAG_API_KEY="your-api-key"
export FEATURE_FLAG_BASE_URL="https://your-service.com"
```

### Basic Usage

```javascript
const { FeatureFlagService } = require('./feature-flags/flag-service');

// Initialize service
const service = new FeatureFlagService({
  firestore: firestoreInstance,
  cacheTTL: 60000
});

// Create a flag
await service.createFlag({
  id: 'my-first-flag',
  type: 'boolean',
  description: 'My first feature flag',
  config: { value: true }
});

// Evaluate flag
const isEnabled = await service.evaluateFlag('my-first-flag', {
  userId: 'user-123'
});
```

## Common Use Cases

### 1. Feature Rollout

Gradually roll out a new feature:

```javascript
// Start with 10% of users
await service.createFlag({
  id: 'new-dashboard',
  type: 'percentage',
  description: 'New dashboard design',
  config: {
    percentage: 10,
    bucketBy: 'userId'
  }
});

// Later increase to 50%
await service.updateFlag('new-dashboard', {
  config: { percentage: 50 }
});

// Finally 100%
await service.updateFlag('new-dashboard', {
  config: { percentage: 100 }
});
```

### 2. A/B Testing

Test multiple variants:

```javascript
await service.createFlag({
  id: 'checkout-flow-test',
  type: 'multivariate',
  description: 'Test checkout flows',
  config: {
    variants: [
      { name: 'control', weight: 50, value: 'existing' },
      { name: 'simplified', weight: 50, value: 'simplified' }
    ],
    bucketBy: 'userId',
    stickyBucketing: true
  }
});

// Get variant for user
const result = await service.evaluateFlag('checkout-flow-test', {
  userId: 'user-123'
});
console.log(result.variant); // 'control' or 'simplified'
```

### 3. User Segmentation

Target specific user segments:

```javascript
await service.createFlag({
  id: 'premium-features',
  type: 'rules',
  description: 'Premium features for premium users',
  config: {
    rules: [
      {
        name: 'premium-users',
        conditions: [
          { attribute: 'subscription.plan', operator: 'equals', value: 'premium' }
        ],
        value: true
      },
      {
        name: 'beta-testers',
        conditions: [
          { attribute: 'user.betaTester', operator: 'equals', value: true }
        ],
        value: true
      }
    ],
    defaultValue: false,
    operator: 'OR'
  }
});
```

### 4. Emergency Kill Switch

Quickly disable problematic features:

```javascript
// Create flag for new feature
await service.createFlag({
  id: 'new-payment-processor',
  type: 'boolean',
  description: 'New payment processor',
  config: { value: true }
});

// Something went wrong - disable immediately
await service.disableFlag('new-payment-processor');
```

### 5. Beta Testing

Enable features for beta testers:

```javascript
await service.createFlag({
  id: 'beta-features',
  type: 'rules',
  description: 'Features for beta testers',
  config: {
    rules: [
      {
        name: 'beta-users',
        conditions: [
          { attribute: 'user.betaTester', operator: 'equals', value: true }
        ],
        value: true
      }
    ],
    defaultValue: false
  }
});
```

## Advanced Features

### 1. Custom Attributes

Use custom attributes in evaluation:

```javascript
const result = await service.evaluateFlag('my-flag', {
  userId: 'user-123',
  sessionId: 'session-456',
  attributes: {
    plan: 'premium',
    region: 'us-west',
    accountAge: 365
  }
});
```

### 2. Flag Dependencies

Check multiple flags:

```javascript
const flags = await service.evaluateFlags([
  'feature-a',
  'feature-b',
  'feature-c'
], context);

if (flags['feature-a'] && flags['feature-b']) {
  // Both features enabled
}
```

### 3. Real-time Updates

Listen for flag changes:

```javascript
service.onFlagChange('my-flag', (flag) => {
  console.log('Flag updated:', flag);
});
```

### 4. Analytics Integration

Track flag usage:

```javascript
const analytics = await service.getFlagAnalytics('my-flag', {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

console.log('Total evaluations:', analytics.totalEvaluations);
console.log('Unique users:', analytics.uniqueUsers);
```

### 5. Rollback

Rollback to previous version:

```javascript
// Get flag history
const history = await service.getFlagHistory('my-flag');

// Rollback to version 2
await service.rollbackFlag('my-flag', 2);
```

## Troubleshooting

### Flag Not Found

**Problem**: Flag evaluation returns default value

**Solutions**:
1. Check flag ID is correct
2. Verify flag exists: `await service.getFlag('my-flag')`
3. Check flag is enabled: `flag.enabled === true`

### Unexpected Evaluation

**Problem**: Flag returns unexpected value

**Solutions**:
1. Check evaluation context matches expected format
2. Verify flag configuration (percentage, rules, etc.)
3. Review flag evaluation logs
4. Test with CLI: `flag-cli evaluate my-flag --user-id test123`

### Performance Issues

**Problem**: Slow flag evaluation

**Solutions**:
1. Enable caching
2. Warm up cache on startup: `await service.warmupCache()`
3. Increase cache TTL
4. Use batch evaluation for multiple flags
5. Check Firestore connection

### Cache Issues

**Problem**: Stale flag values

**Solutions**:
1. Clear cache: `service.clearCache()`
2. Reduce cache TTL
3. Use real-time listeners for immediate updates
4. Check cache hit rate in metrics

## Best Practices

### 1. Flag Naming

```
✅ Good:
- new-story-generation
- v2-media-api
- checkout-flow-variant-a

❌ Bad:
- feature1
- test
- new-thing
```

### 2. Flag Lifecycle

1. **Development**: Create flag, disabled by default
2. **Testing**: Enable for test users
3. **Staging**: Enable for all staging users
4. **Production**: Gradual rollout (10% → 50% → 100%)
5. **Cleanup**: Remove flag after full rollout

### 3. Version Control

Track flag changes:

```javascript
// Always update flag with reason
await service.updateFlag('my-flag', updates, {
  userId: 'user-123',
  reason: 'Rolling out to 50% of users'
});
```

### 4. Monitoring

Monitor flag performance:

```javascript
const metrics = service.getMetrics();
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Average evaluation time:', metrics.avgEvaluationTime);
```

### 5. Testing

Test flag configurations:

```javascript
// Test rule evaluation
const RulesFlag = require('./types/rules-flag');
const flagType = new RulesFlag();
const explanation = flagType.explainRule(rule, testContext);
console.log(explanation);
```

## Examples

### Example 1: Complete Feature Rollout

```javascript
// 1. Create flag
const flag = await service.createFlag({
  id: 'ai-image-generation',
  type: 'percentage',
  description: 'AI-powered image generation',
  config: { percentage: 0 }
});

// 2. Internal testing (10%)
await service.updateFlag('ai-image-generation', {
  config: { percentage: 10 }
});

// 3. Beta users (25%)
await service.updateFlag('ai-image-generation', {
  config: { percentage: 25 }
});

// 4. Half of users (50%)
await service.updateFlag('ai-image-generation', {
  config: { percentage: 50 }
});

// 5. Full rollout (100%)
await service.updateFlag('ai-image-generation', {
  config: { percentage: 100 }
});

// 6. Cleanup after successful rollout
await service.deleteFlag('ai-image-generation');
```

### Example 2: A/B Test Analysis

```javascript
// 1. Create multivariate flag
await service.createFlag({
  id: 'cta-button-test',
  type: 'multivariate',
  description: 'Test CTA button colors',
  config: {
    variants: [
      { name: 'control', weight: 50, value: 'blue' },
      { name: 'variant-a', weight: 25, value: 'green' },
      { name: 'variant-b', weight: 25, value: 'red' }
    ]
  }
});

// 2. Run for 2 weeks

// 3. Analyze results
const analytics = await service.getFlagAnalytics('cta-button-test');
const stats = {};

for (const variant of ['control', 'variant-a', 'variant-b']) {
  const variantData = analytics.evaluationResults[variant];
  stats[variant] = {
    evaluations: variantData?.evaluations || 0,
    conversionRate: variantData?.conversions / variantData?.evaluations
  };
}

console.table(stats);

// 4. Choose winner and update to 100%
```

### Example 3: Progressive Enhancement

```javascript
// Check multiple flags for progressive enhancement
const flags = await service.evaluateFlags([
  'offline-support',
  'push-notifications',
  'background-sync'
], context);

if (flags['offline-support']) {
  enableOfflineMode();
}

if (flags['push-notifications']) {
  enablePushNotifications();
}

if (flags['background-sync']) {
  enableBackgroundSync();
}
```

### Example 4: Geographic Rollout

```javascript
await service.createFlag({
  id: 'regional-feature',
  type: 'rules',
  description: 'Feature for specific regions',
  config: {
    rules: [
      {
        name: 'north-america',
        conditions: [
          { attribute: 'user.country', operator: 'in', value: ['US', 'CA', 'MX'] }
        ],
        value: true
      },
      {
        name: 'europe',
        conditions: [
          { attribute: 'user.country', operator: 'in', value: ['GB', 'DE', 'FR'] }
        ],
        value: true
      }
    ],
    defaultValue: false,
    operator: 'OR'
  }
});
```

### Example 5: Time-Based Rollout

```javascript
await service.createFlag({
  id: 'scheduled-feature',
  type: 'rules',
  description: 'Feature based on time',
  config: {
    rules: [
      {
        name: 'business-hours',
        conditions: [
          { attribute: 'currentTime.hour', operator: 'greater_than_or_equal', value: 9 },
          { attribute: 'currentTime.hour', operator: 'less_than', value: 17 }
        ],
        value: true
      }
    ],
    defaultValue: false
  }
});
```

## SDK Examples

### Node.js SDK

```javascript
const { init, isEnabled, evaluate } = require('./sdk/nodejs-sdk');

init({
  apiKey: process.env.FEATURE_FLAG_API_KEY,
  baseUrl: process.env.FEATURE_FLAG_BASE_URL
});

// Simple check
if (await isEnabled('new-feature')) {
  // Feature enabled
}

// With context
const variant = await evaluate('checkout-test', {
  userId: 'user-123',
  attributes: { plan: 'premium' }
});
```

### Python SDK

```python
from feature_flags import init, is_enabled, evaluate
import os

init(api_key=os.getenv('FEATURE_FLAG_API_KEY'))

# Simple check
if is_enabled('new-feature'):
    # Feature enabled
    pass

# With context
variant = evaluate('checkout-test', context={
    'user_id': 'user-123',
    'attributes': {'plan': 'premium'}
})
```

## CLI Examples

```bash
# List all flags
flag-cli list

# Get flag details
flag-cli get new-feature

# Create a flag
flag-cli add '{
  "id": "test-flag",
  "type": "boolean",
  "config": {"value": true}
}'

# Enable flag
flag-cli enable test-flag

# Evaluate flag
flag-cli evaluate test-flag --user-id user123

# Export all flags
flag-cli export > flags-backup.json

# Import flags
flag-cli import flags-backup.json

# Get analytics
flag-cli analytics test-flag
```

## Conclusion

This guide covers the most common use cases and features of the Feature Flagging System. For more advanced usage and API details, refer to the full API documentation.
