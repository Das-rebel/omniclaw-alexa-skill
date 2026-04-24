# ML Analytics Quick Reference

Quick guide to using the ML-powered predictive analytics system for OmniClaw Enhanced.

## Installation

```bash
# Install ML dependencies
npm install @tensorflow/tfjs-node @google-cloud/bigquery @google-cloud/storage

# Set up infrastructure
gsutil mb gs://omniclaw-ml-raw-data
gsutil mb gs://omniclaw-ml-processed-data
gsutil mb gs://omniclaw-ml-features
gsutil mb gs://omniclaw-ml-models

bq mk omniclaw_ml_training
```

## Quick Start

### 1. Start Data Collection

```javascript
const { DataCollector } = require('./ml-analytics/pipeline/data-collector');

const collector = new DataCollector({
  collectionInterval: 60000,  // 1 minute
  batchSize: 100
});

await collector.startCollection();

// Let it run...
// Later: await collector.stopCollection();
```

### 2. Extract Features

```javascript
const { FeatureExtractor } = require('./ml-analytics/pipeline/feature-extractor');

const extractor = new FeatureExtractor();

// Your raw data
const rawData = await collector.getHistoricalData(
  'cloud-function',
  startDate,
  endDate
);

// Extract features
const features = await extractor.extractFeatures(rawData);

// Returns features in 10 categories:
// - temporal, statistical, trend, seasonal
// - behavioral, system, business, lag, rolling, interaction
```

### 3. Train Capacity Predictor

```javascript
const { CapacityPredictor } = require('./ml-analytics/models/capacity-predictor');

const predictor = new CapacityPredictor({
  predictionHorizon: 168,  // 7 days
  lookbackWindow: 336      // 14 days
});

await predictor.initialize();

// Train with historical data
const results = await predictor.train(trainingData);

console.log('Metrics:', results.metrics);
// { mae: 12.34, rmse: 15.67, mape: 8.9, r2: 0.95 }

// Save model
await predictor.saveModel('./ml-analytics/models/saved/capacity');
```

### 4. Make Predictions

```javascript
// Get current data
const currentData = await collector.getRecentData(336); // Last 14 days

// Make predictions
const predictions = await predictor.predict(currentData, 168);

console.log('Predictions:', predictions.predictions);
// [
//   {
//     hour: 0,
//     timestamp: '2026-03-27T00:00:00.000Z',
//     predictedInvocations: 1234,
//     confidence: 92.5,
//     components: { arima: 1200, prophet: 1250, lstm: 1252 }
//   },
//   ...
// ]

console.log('Recommendations:', predictions.recommendations);
// [
//   {
//     type: 'scale_up',
//     priority: 'high',
//     message: 'Expected peak of 5678 invocations',
//     action: 'Increase instance count',
//     suggestedCapacity: 6814
//   }
// ]
```

### 5. Store Features

```javascript
const { FeatureStore } = require('./ml-analytics/pipeline/feature-store');

const store = new FeatureStore();

// Store features
const featureId = await store.storeFeatures(features, {
  source: 'cloud-function',
  timestamp: new Date().toISOString()
});

// Retrieve features
const retrieved = await store.getFeatures(featureId);

// Get latest features
const latest = await store.getLatestFeatures(100);
```

## Common Tasks

### Export Training Data

```javascript
const data = await collector.exportTrainingData(
  ['cloud-function', 'api-gateway', 'system'],
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  new Date()
);

console.log(`Exported ${data.recordCount} records to ${data.filename}`);
```

### Preprocess Data

```javascript
const { DataPreprocessor } = require('./ml-analytics/pipeline/data-preprocessor');

const preprocessor = new DataPreprocessor({
  outlierMethod: 'iqr',
  normalizationMethod: 'minmax',
  trainTestSplit: 0.8
});

const splits = await preprocessor.preprocess(rawData);

console.log('Train:', splits.splits.train);
console.log('Validation:', splits.splits.validation);
console.log('Test:', splits.splits.test);
```

### Monitor Model Performance

```javascript
const metrics = await predictor.evaluate(testData);

console.log('MAE:', metrics.mae);
console.log('RMSE:', metrics.rmse);
console.log('MAPE:', metrics.mape);
console.log('R²:', metrics.r2);
```

### Check for Retraining

```javascript
if (predictor.needsRetraining()) {
  console.log('Model needs retraining');
  await predictor.train(newTrainingData);
  await predictor.saveModel('./ml-analytics/models/saved/capacity');
}
```

## NPM Scripts

```bash
# Train models
npm run ml:train

# Make predictions
npm run ml:predict

# Retrain models
npm run ml:retrain -- --model=capacity --data-days=30

# Evaluate models
npm run ml:evaluate

# Show metrics
npm run ml:metrics

# Check drift
npm run ml:drift-status

# Training history
npm run ml:history

# Run tests
npm run ml:test
```

## API Endpoints

### Predict Capacity

```bash
curl -X POST https://omniclaw-ml-analytics.omniclaw.cloud/predict/capacity \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "invocations": 1234,
      "timestamp": "2026-03-27T00:00:00.000Z",
      "function": "omniclaw-email"
    }
  }'
```

Response:
```json
{
  "prediction": 1456,
  "confidence": 92.5,
  "recommendations": [
    {
      "type": "scale_up",
      "priority": "high",
      "message": "Expected peak in 2 hours"
    }
  ]
}
```

### Get Model Metrics

```bash
curl https://omniclaw-ml-analytics.omniclaw.cloud/metrics/capacity
```

Response:
```json
{
  "model": "capacity-predictor",
  "lastTraining": "2026-03-27T00:00:00.000Z",
  "metrics": {
    "mae": 12.34,
    "rmse": 15.67,
    "mape": 8.9,
    "r2": 0.95
  }
}
```

## Feature Categories

### Temporal Features (15+)
- hour, day, month, year
- hourSin, hourCos (cyclical)
- isWeekend, isBusinessHour, isPeakHour
- isHoliday, isPayday

### Statistical Features (20+)
- mean, median, mode
- variance, standardDeviation
- skewness, kurtosis
- p10, p25, p50, p75, p90, p95, p99

### Trend Features (5+)
- trend (increasing/decreasing/stable)
- trendSlope, trendStrength
- rSquared

### Seasonal Features (4+)
- dailySeasonality
- weeklySeasonality
- peakHourOfDay
- peakDayOfWeek

### Rolling Window Features (30+)
- rolling6Mean, rolling6Std
- rolling12Mean, rolling12Std
- rolling24Mean, rolling24Std
- rolling48Mean, rolling48Std
- rolling168Mean, rolling168Std

### Lag Features (18+)
- lag1, lag2, lag3, lag6, lag12, lag24
- lag1Diff, lag2Diff, lag3Diff
- lag1PctChange, lag2PctChange

### System Features (20+)
- cpuUsage, memoryUsage
- networkBytesReceived, networkBytesSent
- databaseConnections, cacheHitRate

### Business Features (10+)
- totalCost, costPerRequest
- dailyActiveUsers, requestsPerUser
- averageResponseTime, errorRate

## Model Configuration

### Capacity Predictor

```javascript
const config = {
  predictionHorizon: 168,    // Hours to predict
  lookbackWindow: 336,       // Hours of history
  retrainInterval: 604800000, // 7 days in ms
  ensembleWeights: {
    arima: 0.25,
    prophet: 0.35,
    lstm: 0.40
  }
};
```

### Feature Extractor

```javascript
const config = {
  windowSize: 24,                    // Hours
  lagFeatures: [1, 2, 3, 6, 12, 24],
  rollingWindows: [6, 12, 24, 48, 168],
  percentileBuckets: [10, 25, 50, 75, 90, 95, 99]
};
```

### Data Collector

```javascript
const config = {
  collectionInterval: 60000,   // 1 minute
  batchSize: 100,
  retentionDays: 90,
  rawDataBucket: 'omniclaw-ml-raw-data',
  processedDataBucket: 'omniclaw-ml-processed-data'
};
```

## Troubleshooting

### Out of Memory During Training

```javascript
// Reduce batch size
const predictor = new CapacityPredictor({
  batchSize: 16  // Default is 32
});

// Use smaller lookback window
const predictor = new CapacityPredictor({
  lookbackWindow: 168  // 7 days instead of 14
});
```

### Slow Predictions

```javascript
// Enable caching
const store = new FeatureStore({
  cacheEnabled: true,
  cacheTTL: 300  // 5 minutes
});

// Use batch predictions
const predictions = await predictor.predictBatch(dataArray);
```

### Poor Model Performance

```javascript
// Check for data drift
const driftScore = await detectDataDrift(
  trainingData,
  currentData
);

if (driftScore > 0.2) {
  // Retrain model
  await predictor.train(newData);
}

// Tune hyperparameters
const bestParams = await tuneHyperparameters(
  'capacity',
  trainData,
  validationData
);
```

## Monitoring

### View Logs

```bash
# Data collection logs
gcloud functions logs read omniclaw-ml-analytics --limit 100

# Model server logs
gcloud functions logs read omniclaw-model-server --limit 100
```

### Check Model Performance

```bash
npm run ml:metrics

# Output:
# Capacity Predictor
# MAE: 12.34
# RMSE: 15.67
# MAPE: 8.9%
# R²: 0.95
```

### Monitor Data Drift

```bash
npm run ml:drift-status

# Output:
# Drift Score: 0.15 (OK)
# Last Check: 2026-03-27T00:00:00.000Z
```

## Best Practices

### 1. Data Quality
- Always validate data before training
- Handle missing values appropriately
- Remove or cap outliers
- Normalize features

### 2. Model Training
- Use cross-validation
- Monitor training/validation loss
- Use early stopping
- Save best model

### 3. Deployment
- Version all models
- A/B test before full deployment
- Monitor performance
- Set up alerts

### 4. Maintenance
- Retrain regularly (weekly)
- Monitor for concept drift
- Update features
- Document changes

## Resources

- [Full Documentation](./ML_GUIDE.md)
- [System Overview](./ml-analytics/README.md)
- [Implementation Summary](./ML_ANALYTICS_IMPLEMENTATION_SUMMARY.md)
- [API Documentation](./API_DOCUMENTATION.md)

## Support

For issues:
- GitHub: [omniclaw-enhanced/issues](https://github.com/omniclaw-enhanced/issues)
- Email: support@omniclaw.ai
- Docs: [docs.omniclaw.ai](https://docs.omniclaw.ai)

---

**Quick Reference** | Last Updated: 2026-03-27
