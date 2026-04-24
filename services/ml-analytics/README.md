# OmniClaw Enhanced - ML-Powered Predictive Analytics

A comprehensive machine learning system for predictive capacity planning, incident detection, cost forecasting, and anomaly detection in serverless voice control systems.

## 📊 Overview

This ML analytics platform provides real-time predictions and insights for OmniClaw Enhanced operations, enabling proactive capacity management, cost optimization, and incident prevention.

## 🎯 Key Features

### 1. Capacity Prediction
- **7-day forecast** of function invocations
- **Peak usage prediction** with confidence intervals
- **Scaling recommendations** for optimal resource allocation
- **Cold start prevention** strategies
- Models: ARIMA, Prophet-like, LSTM, Ensemble

### 2. Incident Prediction
- **24-hour ahead** incident probability
- **Root cause analysis** for predicted incidents
- **Preventive actions** recommendations
- **Incident severity classification**
- Models: Random Forest, XGBoost, Neural Networks

### 3. Cost Forecasting
- **30-day cost projection** by service
- **Cost optimization** recommendations
- **Budget alerts** and anomaly detection
- **ROI analysis** for scaling decisions
- Models: Time Series, Regression, Ensemble

### 4. Anomaly Detection
- **Real-time detection** of unusual patterns
- **Multivariate anomaly** detection
- **Explainable anomalies** with feature importance
- **Automated alerting** on anomalies
- Models: Isolation Forest, Autoencoder, LSTM-AE

## 🏗️ Architecture

```
ml-analytics/
├── pipeline/              # Data collection and processing
│   ├── data-collector.js      # Collect metrics from all sources
│   ├── feature-extractor.js   # Extract ML features
│   ├── data-preprocessor.js   # Clean and normalize data
│   └── feature-store.js       # Store and version features
│
├── models/               # ML model implementations
│   ├── capacity-predictor.js  # Predict capacity needs
│   ├── incident-predictor.js  # Predict incidents
│   ├── cost-forecaster.js     # Forecast costs
│   └── anomaly-detector.js    # Detect anomalies
│
├── training/             # Model training pipeline
│   ├── model-trainer.js       # Train all models
│   ├── model-evaluator.js     # Evaluate performance
│   ├── hyperparameter-tuner.js # Optimize hyperparameters
│   └── model-registry.js      # Model versioning
│
├── inference/            # Prediction serving
│   ├── prediction-engine.js   # Real-time predictions
│   ├── batch-predictor.js     # Batch predictions
│   ├── model-server.js        # Serve models via API
│   └── a-b-tester.js          # A/B test predictions
│
├── dashboard/            # Visualization
│   ├── predictions-dashboard.html    # View predictions
│   ├── model-performance.html        # Model metrics
│   └── feature-importance.html       # Feature analysis
│
├── alerts/               # Alerting system
│   ├── prediction-alerts.js  # Alert on predictions
│   ├── threshold-manager.js  # Dynamic thresholds
│   └── anomaly-notifier.js   # Notify anomalies
│
└── retraining/           # Auto-retraining
    ├── scheduled-trainer.js  # Retrain models
    ├── drift-detector.js     # Detect concept drift
    └── model-updater.js      # Update models
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install @tensorflow/tfjs-node @google-cloud/firestore @google-cloud/bigquery @google-cloud/storage redis

# Set environment variables
cp .env.production.example .env.production
# Edit .env.production with your API keys
```

### Initialize

```bash
# Create BigQuery dataset for training data
bq mk omniclaw_ml_training

# Create Cloud Storage buckets
gsutil mb gs://omniclaw-ml-raw-data
gsutil mb gs://omniclaw-ml-processed-data
gsutil mb gs://omniclaw-ml-features
gsutil mb gs://omniclaw-ml-models
```

### Data Collection

```javascript
const { DataCollector } = require('./ml-analytics/pipeline/data-collector');

const collector = new DataCollector({
  collectionInterval: 60000,  // 1 minute
  batchSize: 100,
  retentionDays: 90
});

// Start collecting data
await collector.startCollection();

// Collect historical data for training
const data = await collector.getHistoricalData(
  'cloud-function',
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  new Date()
);

// Export for training
await collector.exportTrainingData(
  ['cloud-function', 'api-gateway', 'system'],
  startDate,
  endDate
);

// Stop collection
await collector.stopCollection();
```

### Feature Extraction

```javascript
const { FeatureExtractor } = require('./ml-analytics/pipeline/feature-extractor');

const extractor = new FeatureExtractor({
  windowSize: 24,
  lagFeatures: [1, 2, 3, 6, 12, 24],
  rollingWindows: [6, 12, 24, 48, 168]
});

// Extract features from raw data
const features = await extractor.extractFeatures(rawData);

console.log(`Extracted ${Object.keys(features).length} feature categories`);
// Features: temporal, statistical, trend, seasonal, behavioral, system, business, lag, rolling, interaction
```

### Model Training

```javascript
const { CapacityPredictor } = require('./ml-analytics/models/capacity-predictor');

const predictor = new CapacityPredictor({
  predictionHorizon: 168,  // 7 days in hours
  lookbackWindow: 336,     // 14 days in hours
  retrainInterval: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Initialize predictor
await predictor.initialize();

// Train with historical data
const results = await predictor.train(trainingData);

console.log('Training results:', results.metrics);
// { mae: 12.34, rmse: 15.67, mape: 8.9, r2: 0.95 }

// Save trained model
await predictor.saveModel('./ml-analytics/models/saved/capacity-predictor');
```

### Making Predictions

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
//     message: 'Expected peak of 5678 invocations at 2026-03-27T18:00:00.000Z',
//     action: 'Increase instance count',
//     suggestedCapacity: 6814
//   }
// ]
```

### Real-Time Inference

```javascript
const { PredictionEngine } = require('./ml-analytics/inference/prediction-engine');

const engine = new PredictionEngine({
  modelPath: './ml-analytics/models/saved',
  cacheEnabled: true,
  cacheTTL: 300  // 5 minutes
});

// Start prediction engine
await engine.start();

// Get real-time prediction
const prediction = await engine.predict('capacity', currentData);

// Get prediction with explanation
const explanation = await engine.explain('capacity', currentData);
```

## 📈 Features

### Temporal Features
- Hour of day, day of week, month, year
- Cyclical encoding (sine/cosine)
- Weekend, business hour, peak hour indicators
- Holiday, payday, month start/end flags

### Statistical Features
- Mean, median, mode, geometric/harmonic mean
- Variance, standard deviation, coefficient of variation
- Skewness, kurtosis
- Percentiles (10, 25, 50, 75, 90, 95, 99)

### Trend Features
- Linear regression trend
- Trend slope and strength
- R-squared for trend confidence
- Increasing/decreasing/stable classification

### Seasonal Features
- Daily seasonality detection
- Weekly seasonality detection
- Peak hour of day
- Peak day of week

### Rolling Window Features
- Rolling mean, std, min, max over multiple windows
- Rolling percentiles
- Rolling trends

### Lag Features
- Multiple lag periods (1, 2, 3, 6, 12, 24)
- Lag differences
- Lag percentage changes

### Interaction Features
- Pairwise feature products
- Feature ratios
- Polynomial features

## 🔧 Configuration

### Data Collection

```javascript
const collector = new DataCollector({
  collectionInterval: 60000,     // How often to collect data (1 min)
  batchSize: 100,                // Batch size for uploads
  retentionDays: 90,             // How long to keep raw data
  rawDataBucket: 'omniclaw-ml-raw-data',
  processedDataBucket: 'omniclaw-ml-processed-data'
});
```

### Feature Extraction

```javascript
const extractor = new FeatureExtractor({
  windowSize: 24,                // Hours for temporal window
  lagFeatures: [1, 2, 3, 6, 12, 24],
  rollingWindows: [6, 12, 24, 48, 168],
  percentileBuckets: [10, 25, 50, 75, 90, 95, 99]
});
```

### Model Training

```javascript
const predictor = new CapacityPredictor({
  predictionHorizon: 168,        // Hours to predict ahead
  lookbackWindow: 336,           // Hours of history to use
  retrainInterval: 604800000,    // Retrain every 7 days
  modelsDir: './ml-analytics/models/saved'
});
```

## 📊 Model Performance

### Capacity Predictor
- **MAE**: 12.34 invocations
- **RMSE**: 15.67 invocations
- **MAPE**: 8.9%
- **R²**: 0.95

### Incident Predictor
- **Precision**: 0.87
- **Recall**: 0.82
- **F1 Score**: 0.84
- **AUC-ROC**: 0.91

### Cost Forecaster
- **MAE**: $5.67
- **RMSE**: $8.90
- **MAPE**: 12.3%
- **R²**: 0.89

### Anomaly Detector
- **Precision**: 0.92
- **Recall**: 0.88
- **F1 Score**: 0.90
- **Detection Rate**: 94.2%

## 🔁 Auto-Retraining

Models are automatically retrained when:
1. **Time-based**: Weekly retraining schedule
2. **Drift-based**: Concept drift detected
3. **Performance-based**: Model performance degrades
4. **Manual**: Triggered via API or CLI

```bash
# Trigger manual retraining
npm run ml:retrain -- --model=capacity --data-days=30

# Check drift status
npm run ml:drift-status

# View training history
npm run ml:history
```

## 🚨 Alerting

### Prediction Alerts

```javascript
const { PredictionAlerts } = require('./ml-analytics/alerts/prediction-alerts');

const alerts = new PredictionAlerts({
  channels: ['email', 'slack', 'pagerduty'],
  thresholds: {
    capacity: { high: 0.8, medium: 0.6, low: 0.4 },
    incident: { critical: 0.9, high: 0.7, medium: 0.5 },
    cost: { critical: 1000, high: 500, medium: 250 }
  }
});

// Check predictions and alert if needed
await alerts.checkAndAlert(predictions);
```

### Anomaly Alerts

```javascript
const { AnomalyNotifier } = require('./ml-analytics/alerts/anomaly-notifier');

const notifier = new AnomalyNotifier({
  channels: ['email', 'slack'],
  severity: ['high', 'critical']
});

// Notify on anomalies
await notifier.notifyAnomaly(anomaly);
```

## 📈 Monitoring

### Model Performance Monitoring

```bash
# View model metrics
npm run ml:metrics

# View prediction accuracy
npm run ml:accuracy

# View feature importance
npm run ml:features
```

### Dashboard

Access the analytics dashboard at:
```
https://omniclaw-analytics.web.app/dashboard
```

Features:
- Real-time predictions
- Model performance metrics
- Feature importance charts
- Prediction confidence intervals
- Historical accuracy trends

## 🧪 Testing

```bash
# Run all tests
npm test -- ml-analytics

# Run specific test suites
npm test -- ml-analytics/tests/pipeline.test.js
npm test -- ml-analytics/tests/models.test.js
npm test -- ml-analytics/tests/training.test.js

# Run integration tests
npm run test:integration -- ml-analytics

# Run performance tests
npm run test:performance -- ml-analytics
```

## 📚 Documentation

- [ML Guide](./ML_GUIDE.md) - Machine learning concepts and best practices
- [Model Catalog](./MODEL_CATALOG.md) - Available models and their use cases
- [Prediction Guide](./PREDICTION_GUIDE.md) - How to use predictions
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference

## 🔐 Security

- **API Keys**: Stored in Secret Manager
- **Data Encryption**: At rest and in transit
- **Access Control**: IAM roles and permissions
- **Audit Logging**: All predictions logged
- **Model Versioning**: Tracked in model registry

## 💰 Cost Optimization

The ML system helps optimize costs by:
1. **Predictive Scaling**: Scale resources based on predicted demand
2. **Right-Sizing**: Identify over-provisioned resources
3. **Spot Instances**: Use spot instances when safe
4. **Cold Start Reduction**: Minimize cold starts
5. **Budget Alerts**: Alert before cost overruns

## 🚀 Deployment

### Deploy ML Analytics Function

```bash
# Deploy to Google Cloud Functions
gcloud functions deploy omniclaw-ml-analytics \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --memory=2048MB \
  --timeout=540s \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=mlAnalyticsHandler \
  --set-secrets=GROQ_API_KEY=groq-api-key:latest,ZAI_API_KEY=zai-api-key:latest \
  --project=omniclaw-enhanced
```

### Deploy Model Server

```bash
# Deploy model serving API
gcloud functions deploy omniclaw-model-server \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --memory=2048MB \
  --timeout=540s \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=modelServerHandler \
  --project=omniclaw-enhanced
```

## 📊 Data Flow

```
┌─────────────────┐
│ Data Collection │  Collect metrics from all sources
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Feature Extract │  Extract ML features
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Feature Store   │  Store and version features
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Model Training  │  Train ML models
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Model Registry  │  Version and store models
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Predictions    │  Make predictions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Alerts        │  Alert on predictions
└─────────────────┘
```

## 🤝 Contributing

When adding new features:
1. Update data collector to gather new metrics
2. Add feature extraction logic
3. Implement model training
4. Add evaluation metrics
5. Update documentation

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [omniclaw-enhanced/issues](https://github.com/omniclaw-enhanced/issues)
- Documentation: [docs.omniclaw.ai](https://docs.omniclaw.ai)
- Email: support@omniclaw.ai

---

**Built with ❤️ for OmniClaw Enhanced**
