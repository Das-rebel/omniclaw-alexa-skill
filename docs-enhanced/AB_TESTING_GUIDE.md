# A/B Testing Guide

Complete guide for conducting A/B tests using the Feature Flagging System

## Table of Contents

1. [Introduction](#introduction)
2. [Setting Up A/B Tests](#setting-up-ab-tests)
3. [Analyzing Results](#analyzing-results)
4. [Statistical Significance](#statistical-significance)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)
7. [Case Studies](#case-studies)

## Introduction

A/B testing (split testing) compares two versions of a feature to determine which performs better. The Feature Flagging System provides comprehensive multivariate flag support for running A/B tests.

### Key Concepts

- **Control Group**: Existing version (baseline)
- **Variant**: New version being tested
- **Traffic Allocation**: Percentage of users seeing each version
- **Statistical Significance**: Confidence that results aren't random
- **Conversion Rate**: Percentage of users who take desired action

## Setting Up A/B Tests

### 1. Simple A/B Test

Compare two versions:

```javascript
await service.createFlag({
  id: 'checkout-button-test',
  type: 'multivariate',
  description: 'Test checkout button colors',
  config: {
    variants: [
      {
        name: 'control',
        weight: 50,
        value: 'blue',
        description: 'Current blue button'
      },
      {
        name: 'variant-a',
        weight: 50,
        value: 'green',
        description: 'New green button'
      }
    ],
    bucketBy: 'userId',
    stickyBucketing: true
  }
});
```

### 2. Multi-Variant Test

Test multiple versions:

```javascript
await service.createFlag({
  id: 'pricing-page-test',
  type: 'multivariate',
  description: 'Test different pricing layouts',
  config: {
    variants: [
      { name: 'control', weight: 40, value: 'current' },
      { name: 'variant-a', weight: 20, value: 'highlighted' },
      { name: 'variant-b', weight: 20, value: 'minimal' },
      { name: 'variant-c', weight: 20, value: 'detailed' }
    ]
  }
});
```

### 3. Gradual Rollout Test

Start small, scale up:

```javascript
// Week 1: 10% to each variant
await service.createFlag({
  id: 'new-checkout-flow',
  type: 'multivariate',
  config: {
    variants: [
      { name: 'control', weight: 90, value: 'existing' },
      { name: 'variant-a', weight: 10, value: 'simplified' }
    ]
  }
});

// Week 2: Increase to 25%
await service.updateFlag('new-checkout-flow', {
  config: {
    variants: [
      { name: 'control', weight: 75, value: 'existing' },
      { name: 'variant-a', weight: 25, value: 'simplified' }
    ]
  }
});

// Week 3: 50/50 split
await service.updateFlag('new-checkout-flow', {
  config: {
    variants: [
      { name: 'control', weight: 50, value: 'existing' },
      { name: 'variant-a', weight: 50, value: 'simplified' }
    ]
  }
});
```

### 4. Segmented A/B Test

Test specific user segments:

```javascript
await service.createFlag({
  id: 'premium-pricing-test',
  type: 'multivariate',
  description: 'Test pricing for premium users',
  config: {
    variants: [
      { name: 'control', weight: 50, value: 'current' },
      { name: 'variant-a', weight: 50, value: 'discounted' }
    ]
  }
});

// Only evaluate for premium users
const result = await service.evaluateFlag('premium-pricing-test', {
  userId: 'user-123',
  attributes: {
    plan: 'premium'
  }
});
```

## Analyzing Results

### 1. Collect Metrics

Track key metrics for each variant:

```javascript
// Track conversion events
async function trackConversion(flagId, variant, userId) {
  await analytics.track({
    event: 'conversion',
    flagId,
    variant,
    userId,
    timestamp: new Date()
  });
}

// Get analytics
const analytics = await service.getFlagAnalytics('checkout-button-test', {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

console.log('Total evaluations:', analytics.totalEvaluations);
console.log('Results by variant:', analytics.evaluationResults);
```

### 2. Calculate Metrics

```javascript
function calculateMetrics(analytics) {
  const metrics = {};

  for (const [variant, data] of Object.entries(analytics.evaluationResults)) {
    metrics[variant] = {
      impressions: data.evaluations,
      conversions: data.conversions,
      conversionRate: (data.conversions / data.evaluations * 100).toFixed(2) + '%',
      revenue: data.revenue || 0,
      avgRevenue: data.revenue / data.conversions
    };
  }

  return metrics;
}

const metrics = calculateMetrics(analytics);
console.table(metrics);
```

### 3. Compare Variants

```javascript
function compareVariants(metrics, control = 'control') {
  const controlMetrics = metrics[control];
  const results = {};

  for (const [variant, data] of Object.entries(metrics)) {
    if (variant === control) continue;

    const lift = (
      (parseFloat(data.conversionRate) - parseFloat(controlMetrics.conversionRate)) /
      parseFloat(controlMetrics.conversionRate) * 100
    ).toFixed(2);

    results[variant] = {
      conversionRate: data.conversionRate,
      lift: lift + '%',
      significant: isStatisticallySignificant(controlMetrics, data)
    };
  }

  return results;
}
```

## Statistical Significance

### 1. Calculate Sample Size

```javascript
function calculateSampleSize(
  baselineConversion,
  minimumDetectableEffect,
  confidence = 0.95
) {
  const z = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  }[confidence];

  const p1 = baselineConversion;
  const p2 = baselineConversion * (1 + minimumDetectableEffect);
  const pAvg = (p1 + p2) / 2;

  const sampleSize = Math.ceil(
    (2 * Math.pow(z, 2) * pAvg * (1 - pAvg)) /
    Math.pow(p2 - p1, 2)
  );

  return sampleSize;
}

// Example: Need 15,000 users per variant
const sampleSize = calculateSampleSize(0.03, 0.10); // 3% baseline, 10% minimum effect
console.log('Required sample size:', sampleSize);
```

### 2. Calculate Confidence Interval

```javascript
function calculateConfidenceInterval(conversions, total, confidence = 0.95) {
  if (total === 0) return null;

  const p = conversions / total;
  const z = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  }[confidence];

  const margin = z * Math.sqrt((p * (1 - p)) / total);

  return {
    lower: Math.max(0, (p - margin) * 100),
    upper: Math.min(100, (p + margin) * 100),
    margin: margin * 100
  };
}

// Example
const ci = calculateConfidenceInterval(150, 5000);
console.log('95% CI:', ci.lower + '% - ' + ci.upper + '%');
```

### 3. Statistical Significance Test

```javascript
function isStatisticallySignificant(control, variant, confidence = 0.95) {
  const n1 = control.impressions;
  const n2 = variant.impressions;
  const p1 = control.conversions / n1;
  const p2 = variant.conversions / n2;

  const pooledP = (control.conversions + variant.conversions) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

  const z = (p2 - p1) / se;
  const criticalZ = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  }[confidence];

  return Math.abs(z) > criticalZ;
}
```

## Best Practices

### 1. Test Duration

- **Minimum**: 2 weeks (to capture weekly patterns)
- **Recommended**: 4 weeks
- **Maximum**: 8 weeks (avoid test fatigue)

```javascript
const testDuration = 28 * 24 * 60 * 60 * 1000; // 28 days in ms
const startDate = new Date('2024-01-01');
const endDate = new Date(startDate.getTime() + testDuration);
```

### 2. Sample Size

- **Minimum**: 1,000 users per variant
- **Recommended**: 10,000+ users per variant
- **For small effects**: 50,000+ users per variant

```javascript
const requiredSampleSize = calculateSampleSize(
  0.03,  // 3% baseline conversion
  0.05   // 5% minimum detectable effect
);
```

### 3. Traffic Allocation

- **Initial**: 90/10 (control/variant)
- **Ramp up**: 75/25, then 50/50
- **Final**: 50/50 for full comparison

### 4. Success Metrics

Define clear success criteria:

```javascript
const successMetrics = {
  primary: 'checkout_completion_rate',
  secondary: [
    'time_to_checkout',
    'cart_abandonment_rate',
    'refund_rate'
  ],
  thresholds: {
    minimumImprovement: '5%',
    targetImprovement: '10%',
    stretchGoal: '15%'
  }
};
```

### 5. Monitoring

Monitor test continuously:

```javascript
// Check daily
async function monitorTest(flagId) {
  const analytics = await service.getFlagAnalytics(flagId, {
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
  });

  const metrics = calculateMetrics(analytics);
  console.table(metrics);

  // Alert if something is wrong
  for (const [variant, data] of Object.entries(metrics)) {
    if (data.conversionRate < 0.01) {
      alert(`Variant ${variant} has very low conversion rate`);
    }
  }
}
```

## Common Pitfalls

### 1. Stopping Tests Too Early

❌ **Wrong**: Stopping after 3 days because variant looks better

✅ **Correct**: Run for minimum 2 weeks to capture weekly patterns

### 2. Insufficient Sample Size

❌ **Wrong**: Making decisions with 100 users per variant

✅ **Correct**: Calculate required sample size before starting

### 3. Multiple Variants

❌ **Wrong**: Testing 10 variants with equal traffic

✅ **Correct**: Start with 2 variants, expand only if needed

### 4. Ignoring Segments

❌ **Wrong**: Looking only at overall conversion rate

✅ **Correct**: Analyze by user segments (new vs. returning, mobile vs. desktop)

### 5. Peeking at Results

❌ **Wrong**: Checking results daily and stopping when favorable

✅ **Correct**: Pre-determine test duration and stick to it

### 6. Not Testing Bugs

❌ **Wrong**: Variant has errors but still counted as conversion

✅ **Correct**: Monitor error rates separately

## Case Studies

### Case Study 1: Checkout Button Color

**Goal**: Increase checkout completion rate

**Hypothesis**: Green color conveys "go" and increases conversions

**Setup**:
```javascript
{
  control: 'blue button (current)',
  variant: 'green button'
}
```

**Results**:
- Control: 3.2% conversion (±0.2%)
- Variant: 3.5% conversion (±0.2%)
- Improvement: +9.4%
- Statistical significance: 99% confident

**Conclusion**: Roll out green button to 100% of users

### Case Study 2: Simplified Checkout Flow

**Goal**: Reduce checkout abandonment

**Hypothesis**: Fewer form fields increase completion rate

**Setup**:
```javascript
{
  control: '5 fields (current)',
  variant: '3 fields (simplified)'
}
```

**Results**:
- Control: 2.8% conversion
- Variant: 3.1% conversion
- Improvement: +10.7%
- Time to checkout: -25%

**Conclusion**: Roll out simplified flow, monitor refund rates

### Case Study 3: Pricing Display

**Goal**: Increase revenue per user

**Hypothesis**: Showing annual savings increases annual plan signups

**Setup**:
```javascript
{
  control: 'Monthly pricing: $10/mo, Annual: $100/yr',
  variant: 'Monthly pricing: $10/mo, Annual: $100/yr (Save $20!)'
}
```

**Results**:
- Control: 15% annual signup rate
- Variant: 18% annual signup rate
- Improvement: +20%
- Revenue per user: +8.5%

**Conclusion**: Roll out to all users, monitor churn rate

## Advanced Techniques

### 1. Multi-Armed Bandit

Automatically allocate more traffic to winning variants:

```javascript
async function multiArmedBandit(flagId) {
  const analytics = await service.getFlagAnalytics(flagId);
  const variants = analytics.evaluationResults;

  // Calculate performance score for each variant
  const scores = {};
  for (const [name, data] of Object.entries(variants)) {
    scores[name] = data.conversions / data.evaluations;
  }

  // Calculate new weights based on performance
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const newVariants = Object.keys(variants).map(name => ({
    name,
    weight: Math.round((scores[name] / totalScore) * 100)
  }));

  // Update flag with new weights
  await service.updateFlag(flagId, {
    config: { variants: newVariants }
  });
}
```

### 2. Sequential Testing

Test variants sequentially rather than simultaneously:

```javascript
// Week 1-2: Test variant A vs control
// Week 3-4: Test variant B vs control
// Week 5-6: Test winners against each other
```

### 3. Targeted Testing

Test specific segments:

```javascript
// Test new features only on new users
const result = await service.evaluateFlag('new-user-onboarding', {
  userId: 'user-123',
  attributes: {
    isExistingUser: false,
    signupDate: '2024-01-15'
  }
});
```

## Conclusion

A/B testing is a powerful tool for data-driven decisions. Follow these principles:

1. **Start with hypothesis**: Define what you're testing and why
2. **Calculate sample size**: Ensure sufficient data
3. **Run long enough**: Minimum 2 weeks, preferably 4
4. **Monitor continuously**: Track errors and anomalies
5. **Analyze properly**: Use statistical significance tests
6. **Document results**: Learn from each test

The Feature Flagging System provides all the tools you need to run professional A/B tests. Use them wisely!
