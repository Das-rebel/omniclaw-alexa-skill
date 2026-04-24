# Machine Learning Guide for OmniClaw Enhanced

Complete guide to machine learning concepts, implementation, and best practices for the OmniClaw Enhanced predictive analytics system.

## Table of Contents

1. [Overview](#overview)
2. [Machine Learning Concepts](#machine-learning-concepts)
3. [Model Architectures](#model-architectures)
4. [Feature Engineering](#feature-engineering)
5. [Training Pipeline](#training-pipeline)
6. [Model Evaluation](#model-evaluation)
7. [Deployment](#deployment)
8. [Monitoring](#monitoring)
9. [Best Practices](#best-practices)

## Overview

The ML system for OmniClaw Enhanced uses four main predictive models:

1. **Capacity Predictor** - Forecast function invocations
2. **Incident Predictor** - Predict probability of incidents
3. **Cost Forecaster** - Forecast cloud costs
4. **Anomaly Detector** - Detect unusual patterns

Each model is trained on historical data and provides predictions with confidence intervals.

## Machine Learning Concepts

### Time Series Forecasting

Time series forecasting predicts future values based on historical time-ordered data.

**Key Concepts:**

- **Trend**: Long-term increase or decrease in data
- **Seasonality**: Regular patterns that repeat at fixed intervals
- **Cyclicity**: Patterns that repeat but not at fixed intervals
- **Noise**: Random variation in the data

**Methods Used:**

1. **ARIMA** (AutoRegressive Integrated Moving Average)
   - Good for: Linear trends, stationary data
   - Parameters: p (AR order), d (differencing), q (MA order)
   - Formula: yₜ = c + φ₁yₜ₋₁ + ... + φₚyₜ₋ₚ + θ₁εₜ₋₁ + ... + θ_qεₜ₋q + εₜ

2. **Prophet-like** (Decomposable Time Series)
   - Good for: Multiple seasonality, trend changes
   - Components: Trend + Seasonality + Holidays + Noise
   - Formula: yₜ = g(t) + s(t) + h(t) + εₜ

3. **LSTM** (Long Short-Term Memory)
   - Good for: Complex patterns, long-term dependencies
   - Architecture: Recurrent neural network with memory cells
   - Formula: hₜ = σ(Wₓxₜ + Wₕhₜ₋₁ + b)

### Supervised Learning

Supervised learning learns patterns from labeled training data.

**Types:**

1. **Regression** - Predict continuous values
   - Examples: Cost forecasting, capacity prediction
   - Metrics: MAE, RMSE, R²

2. **Classification** - Predict discrete labels
   - Examples: Incident prediction, anomaly detection
   - Metrics: Accuracy, Precision, Recall, F1, AUC-ROC

### Anomaly Detection

Anomaly detection identifies data points that deviate significantly from normal patterns.

**Methods:**

1. **Isolation Forest**
   - Principle: Anomalies are easier to isolate
   - Algorithm: Randomly split data, measure path length
   - Advantages: Efficient, handles high-dimensional data

2. **Autoencoder**
   - Principle: Learn to reconstruct normal data
   - Algorithm: Neural network that compresses and reconstructs
   - Anomalies: High reconstruction error

3. **LSTM-Autoencoder**
   - Combines LSTM with autoencoder
   - Good for: Time series anomalies
   - Captures temporal dependencies

## Model Architectures

### Capacity Predictor

**Architecture:**

```javascript
Ensemble Model
├── ARIMA (25% weight)
│   ├── Auto-Regressive: p=5
│   ├── Integrated: d=1
│   └── Moving Average: q=5
│
├── Prophet-like (35% weight)
│   ├── Trend Component: Linear
│   ├── Seasonality: Daily + Weekly
│   └── Holiday Effects
│
└── LSTM (40% weight)
    ├── Layer 1: LSTM(128) + Dropout(0.2)
    ├── Layer 2: LSTM(64) + Dropout(0.2)
    ├── Layer 3: Dense(32, ReLU)
    ├── Layer 4: Dense(16, ReLU)
    └── Output: Dense(168)  // 7 days hourly
```

**Training:**

```javascript
// Prepare time series data
const sequences = prepareTimeSeries(data, {
  lookback: 336,  // 14 days
  horizon: 168,   // 7 days
  frequency: '1H'
});

// Train individual models
const arima = trainARIMA(sequences);
const prophet = trainProphet(sequences);
const lstm = trainLSTM(sequences);

// Ensemble predictions
const predictions = ensemble({
  arima: arima.predict(),
  prophet: prophet.predict(),
  lstm: lstm.predict()
}, weights: { arima: 0.25, prophet: 0.35, lstm: 0.40 });
```

### Incident Predictor

**Architecture:**

```javascript
Random Forest Classifier
├── 100 Trees
├── Max Depth: 20
├── Min Samples Split: 10
├── Min Samples Leaf: 5
└── Features: All extracted features

XGBoost Classifier
├── 100 Estimators
├── Max Depth: 10
├── Learning Rate: 0.01
├── Subsample: 0.8
└── Colsample Bytree: 0.8

Neural Network
├── Input Layer: All features
├── Hidden Layer 1: Dense(128, ReLU) + Dropout(0.3)
├── Hidden Layer 2: Dense(64, ReLU) + Dropout(0.3)
├── Hidden Layer 3: Dense(32, ReLU) + Dropout(0.2)
└── Output Layer: Dense(1, Sigmoid)
```

**Training:**

```javascript
// Prepare binary classification data
const X = extractFeatures(incidentData);
const y = incidentData.map(d => d.incidentOccurred ? 1 : 0);

// Handle class imbalance
const { X_balanced, y_balanced } = balanceClasses(X, y, {
  method: 'SMOTE',  // Synthetic Minority Over-sampling
  ratio: 0.5
});

// Train models
const rf = trainRandomForest(X_balanced, y_balanced);
const xgb = trainXGBoost(X_balanced, y_balanced);
const nn = trainNeuralNetwork(X_balanced, y_balanced);

// Ensemble with voting
const predictions = ensembleVote({
  rf: rf.predict_proba(X),
  xgb: xgb.predict_proba(X),
  nn: nn.predict_proba(X)
});
```

### Cost Forecaster

**Architecture:**

```javascript
Multi-Output Regression
├── Feature Extraction
│   ├── Service Costs: GCS, Cloud Functions, BigQuery
│   ├── Usage Metrics: Invocations, Storage, Queries
│   └── Temporal Features: Hour, Day, Month
│
└── Regression Models
    ├── Linear Regression: Baseline
    ├── Random Forest: Non-linear relationships
    ├── Gradient Boosting: Complex patterns
    └── Ensemble: Weighted average
```

**Training:**

```javascript
// Prepare multi-target data
const targets = [
  'gcsCost',
  'functionsCost',
  'bigqueryCost',
  'totalCost'
];

// Train separate model for each target
const models = {};
for (const target of targets) {
  models[target] = trainRegressor(X, y[target]);
}

// Ensemble predictions
const forecast = {};
for (const target of targets) {
  forecast[target] = models[target].predict(X_future);
}
```

### Anomaly Detector

**Architecture:**

```javascript
Isolation Forest
├── N Estimators: 100
├── Max Samples: 256
├── Contamination: 0.1
└── Features: All numeric features

Autoencoder
├── Input Layer: All features
├── Encoder:
│   ├── Dense(64, ReLU)
│   ├── Dense(32, ReLU)
│   └── Dense(16, ReLU)  // Bottleneck
├── Decoder:
│   ├── Dense(32, ReLU)
│   ├── Dense(64, ReLU)
│   └── Dense(n_features, Sigmoid)
└── Loss: MSE

LSTM-Autoencoder
├── Encoder LSTM: LSTM(64) → LSTM(32) → LSTM(16)
├── Decoder LSTM: LSTM(32) → LSTM(64) → Dense(n_features)
└── Sequence Length: 24 timesteps
```

**Training:**

```javascript
// Train on normal data only
const normalData = data.filter(d => !d.isAnomaly);

// Train Isolation Forest
const isoForest = trainIsolationForest(normalData, {
  contamination: 0.1,
  n_estimators: 100
});

// Train Autoencoder
const autoencoder = trainAutoencoder(normalData, {
  encoding_dim: 16,
  epochs: 100,
  batch_size: 32
});

// Detect anomalies
const anomalyScore = isoForest.score_samples(newData);
const reconstructionError = autoencoder.evaluate(newData);

// Combine scores
const finalScore = 0.5 * anomalyScore + 0.5 * reconstructionError;
const isAnomaly = finalScore > threshold;
```

## Feature Engineering

### Temporal Features

Transform timestamps into meaningful features:

```javascript
function extractTemporalFeatures(timestamp) {
  const date = new Date(timestamp);

  return {
    // Basic components
    hour: date.getHours(),
    day: date.getDay(),
    dayOfMonth: date.getDate(),
    month: date.getMonth(),
    quarter: Math.floor(date.getMonth() / 3) + 1,

    // Cyclical encoding (preserves circular nature)
    hourSin: Math.sin(2 * Math.PI * date.getHours() / 24),
    hourCos: Math.cos(2 * Math.PI * date.getHours() / 24),
    daySin: Math.sin(2 * Math.PI * date.getDay() / 7),
    dayCos: Math.cos(2 * Math.PI * date.getDay() / 7),
    monthSin: Math.sin(2 * Math.PI * date.getMonth() / 12),
    monthCos: Math.cos(2 * Math.PI * date.getMonth() / 12),

    // Flags
    isWeekend: [0, 6].includes(date.getDay()),
    isBusinessHour: date.getHours() >= 9 && date.getHours() < 17,
    isPeakHour: date.getHours() >= 18 && date.getHours() < 22,
    isHoliday: isHoliday(date),
    isPayday: isPayday(date)
  };
}
```

### Statistical Features

Calculate descriptive statistics:

```javascript
function extractStatisticalFeatures(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    // Central tendency
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    mode: getMode(values),

    // Dispersion
    variance: values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length,
    std: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],

    // Percentiles
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
    iqr: p75 - p25,

    // Shape
    skewness: calculateSkewness(values),
    kurtosis: calculateKurtosis(values)
  };
}
```

### Rolling Window Features

Calculate rolling statistics over time windows:

```javascript
function extractRollingFeatures(timeSeries, windows) {
  const features = {};

  for (const window of windows) {
    const windowData = timeSeries.slice(-window);

    features[`rolling${window}Mean`] = mean(windowData);
    features[`rolling${window}Std`] = std(windowData);
    features[`rolling${window}Min`] = Math.min(...windowData);
    features[`rolling${window}Max`] = Math.max(...windowData);
    features[`rolling${window}Trend`] =
      (windowData[windowData.length - 1] - windowData[0]) / window;
  }

  return features;
}
```

### Lag Features

Use past values as features:

```javascript
function extractLagFeatures(timeSeries, lags) {
  const features = {};
  const n = timeSeries.length;

  for (const lag of lags) {
    if (n > lag) {
      features[`lag${lag}`] = timeSeries[n - 1 - lag];
      features[`lag${lag}Diff`] = timeSeries[n - 1] - timeSeries[n - 1 - lag];
      features[`lag${lag}PctChange`] =
        ((timeSeries[n - 1] - timeSeries[n - 1 - lag]) / timeSeries[n - 1 - lag]) * 100;
    }
  }

  return features;
}
```

## Training Pipeline

### Data Preparation

```javascript
async function prepareTrainingData(sources, startDate, endDate) {
  // 1. Collect raw data
  const rawData = await collectData(sources, startDate, endDate);

  // 2. Extract features
  const features = await extractFeatures(rawData);

  // 3. Clean data
  const cleaned = cleanData(features);

  // 4. Handle missing values
  const imputed = imputeMissingValues(cleaned);

  // 5. Remove outliers
  const filtered = removeOutliers(imputed);

  // 6. Normalize
  const normalized = normalizeData(filtered);

  // 7. Encode categoricals
  const encoded = encodeCategorical(normalized);

  // 8. Split data
  const { train, validation, test } = splitData(encoded, {
    train: 0.7,
    validation: 0.15,
    test: 0.15
  });

  return { train, validation, test };
}
```

### Model Training

```javascript
async function trainModel(modelType, trainData, validationData) {
  // 1. Initialize model
  const model = createModel(modelType);

  // 2. Define hyperparameters
  const hyperparameters = getHyperparameters(modelType);

  // 3. Train model
  const trainedModel = await model.fit(trainData, {
    epochs: hyperparameters.epochs,
    batchSize: hyperparameters.batchSize,
    validationData: validationData,
    callbacks: [
      earlyStopping({ patience: 10 }),
      modelCheckpoint('./best_model'),
      tensorBoard('./logs')
    ]
  });

  // 4. Evaluate model
  const metrics = evaluateModel(trainedModel, validationData);

  return { model: trainedModel, metrics };
}
```

### Hyperparameter Tuning

```javascript
async function tuneHyperparameters(modelType, trainData, validationData) {
  // Define search space
  const searchSpace = {
    learningRate: [0.001, 0.01, 0.1],
    batchSize: [16, 32, 64],
    hiddenUnits: [64, 128, 256],
    dropoutRate: [0.1, 0.2, 0.3],
    l2Regularization: [0.001, 0.01, 0.1]
  };

  // Grid search or random search
  const bestConfig = await gridSearch(
    modelType,
    trainData,
    validationData,
    searchSpace
  );

  return bestConfig;
}
```

## Model Evaluation

### Regression Metrics

```javascript
function evaluateRegression(actual, predicted) {
  const n = actual.length;

  // Mean Absolute Error
  const mae = actual.reduce((sum, a, i) => sum + Math.abs(a - predicted[i]), 0) / n;

  // Root Mean Squared Error
  const rmse = Math.sqrt(
    actual.reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0) / n
  );

  // Mean Absolute Percentage Error
  const mape = actual.reduce((sum, a, i) =>
    sum + Math.abs((a - predicted[i]) / a), 0) / n * 100;

  // R-squared
  const avgActual = actual.reduce((sum, a) => sum + a, 0) / n;
  const ssRes = actual.reduce((sum, a, i) =>
    sum + Math.pow(a - predicted[i], 2), 0);
  const ssTot = actual.reduce((sum, a) =>
    sum + Math.pow(a - avgActual, 2), 0);
  const r2 = 1 - (ssRes / ssTot);

  return { mae, rmse, mape, r2 };
}
```

### Classification Metrics

```javascript
function evaluateClassification(actual, predicted, probabilities) {
  // Confusion Matrix
  const tp = predicted.filter((p, i) => p === 1 && actual[i] === 1).length;
  const tn = predicted.filter((p, i) => p === 0 && actual[i] === 0).length;
  const fp = predicted.filter((p, i) => p === 1 && actual[i] === 0).length;
  const fn = predicted.filter((p, i) => p === 0 && actual[i] === 1).length;

  // Metrics
  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1 = 2 * (precision * recall) / (precision + recall);

  // AUC-ROC
  const auc = calculateAUC(actual, probabilities);

  return { accuracy, precision, recall, f1, auc, tp, tn, fp, fn };
}
```

## Deployment

### Model Serving

```javascript
class ModelServer {
  constructor(modelPath) {
    this.model = null;
    this.modelPath = modelPath;
  }

  async load() {
    this.model = await tf.loadLayersModel(`file://${this.modelPath}`);
  }

  async predict(features) {
    const preprocessed = this.preprocess(features);
    const prediction = await this.model.predict(preprocessed);
    return this.postprocess(prediction);
  }

  async predictBatch(featuresBatch) {
    const preprocessed = featuresBatch.map(f => this.preprocess(f));
    const predictions = await this.model.predict(preprocessed);
    return predictions;
  }
}
```

### API Endpoint

```javascript
app.post('/api/predict/capacity', async (req, res) => {
  try {
    const { features } = req.body;

    // Validate input
    if (!features) {
      return res.status(400).json({ error: 'Missing features' });
    }

    // Make prediction
    const prediction = await capacityPredictor.predict(features);

    // Return result
    res.json({
      prediction: prediction.predictedInvocations,
      confidence: prediction.confidence,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});
```

## Monitoring

### Model Performance Monitoring

```javascript
async function monitorModelPerformance(model, testData) {
  // Make predictions
  const predictions = await model.predict(testData.features);

  // Calculate metrics
  const metrics = evaluateModel(testData.labels, predictions);

  // Check for degradation
  const threshold = {
    mae: 20,  // Alert if MAE > 20
    rmse: 30,  // Alert if RMSE > 30
    mape: 15  // Alert if MAPE > 15%
  };

  if (metrics.mae > threshold.mae) {
    await alert('MAE exceeded threshold', { mae: metrics.mae });
  }

  // Log metrics
  await logMetrics('model_performance', {
    model: model.name,
    ...metrics,
    timestamp: new Date().toISOString()
  });

  return metrics;
}
```

### Data Drift Detection

```javascript
async function detectDataDrift(trainingData, currentData) {
  // Calculate feature distributions
  const trainDist = calculateDistribution(trainingData);
  const currentDist = calculateDistribution(currentData);

  // Calculate KL divergence
  const driftScore = calculateKLDivergence(trainDist, currentDist);

  // Check threshold
  if (driftScore > 0.2) {  // Significant drift
    await alert('Data drift detected', { driftScore });
    await retrainModel();  // Trigger retraining
  }

  return driftScore;
}
```

## Best Practices

### 1. Data Quality

- Always validate data before training
- Handle missing values appropriately
- Remove or cap outliers
- Normalize features to similar scales
- Use feature selection to reduce dimensionality

### 2. Model Training

- Use cross-validation for robust evaluation
- Monitor training/validation loss to prevent overfitting
- Use early stopping to prevent overfitting
- Save best model during training
- Log all hyperparameters and metrics

### 3. Model Deployment

- Version all models
- A/B test new models before full deployment
- Monitor model performance in production
- Set up alerts for performance degradation
- Have rollback plan ready

### 4. Model Maintenance

- Retrain models regularly (weekly/monthly)
- Monitor for concept drift
- Update features as system evolves
- Keep training data up-to-date
- Document model changes

### 5. Performance Optimization

- Use feature caching for faster inference
- Batch predictions when possible
- Use quantization for smaller models
- Implement prediction caching
- Use GPU for training large models

---

**For more information, see:**
- [README.md](./README.md) - System overview
- [MODEL_CATALOG.md](./MODEL_CATALOG.md) - Available models
- [PREDICTION_GUIDE.md](./PREDICTION_GUIDE.md) - Using predictions
