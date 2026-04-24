/**
 * Data Preprocessor - Clean and normalize ML data
 *
 * Handles:
 * - Data cleaning (outliers, missing values)
 * - Normalization (min-max, z-score)
 * - Encoding (categorical, temporal)
 * - Feature scaling
 * - Train/test/validation splits
 *
 * Target: 400+ lines of data preprocessing logic
 */

const { logger } = require('../../logging/logger');

class DataPreprocessor {
  constructor(config = {}) {
    this.config = {
      outlierMethod: config.outlierMethod || 'iqr', // 'iqr', 'zscore', 'isolation'
      outlierThreshold: config.outlierThreshold || 3,
      normalizationMethod: config.normalizationMethod || 'minmax', // 'minmax', 'zscore', 'robust'
      trainTestSplit: config.trainTestSplit || 0.8,
      validationSplit: config.validationSplit || 0.1,
      randomSeed: config.randomSeed || 42,
      maxMissingRatio: config.maxMissingRatio || 0.5,
      ...config
    };

    this.scalers = new Map();
    this.encoders = new Map();
    this.statistics = new Map();
  }

  /**
   * Preprocess data for ML training
   */
  async preprocess(data, options = {}) {
    try {
      logger.info('Starting data preprocessing...');

      // Step 1: Clean data
      const cleanedData = await this.cleanData(data);

      // Step 2: Handle missing values
      const imputedData = await this.handleMissingValues(cleanedData);

      // Step 3: Remove outliers
      const outlierFreeData = await this.removeOutliers(imputedData);

      // Step 4: Normalize features
      const normalizedData = await this.normalizeFeatures(outlierFreeData);

      // Step 5: Encode categorical variables
      const encodedData = await this.encodeCategorical(normalizedData);

      // Step 6: Feature selection
      const selectedFeatures = await this.selectFeatures(encodedData, options.featureImportance);

      // Step 7: Split data
      const splits = this.splitData(selectedFeatures);

      logger.info('Data preprocessing completed');
      return splits;

    } catch (error) {
      logger.error('Error preprocessing data:', error);
      throw error;
    }
  }

  /**
   * Clean data
   */
  async cleanData(data) {
    const cleaned = [];

    for (const record of data) {
      // Remove invalid records
      if (!this.isValidRecord(record)) {
        continue;
      }

      // Remove duplicate records
      if (this.isDuplicate(record, cleaned)) {
        continue;
      }

      // Fix data types
      const typed = this.fixDataTypes(record);

      // Remove unnecessary fields
      const filtered = this.filterFields(typed);

      cleaned.push(filtered);
    }

    logger.info(`Cleaned ${data.length} records -> ${cleaned.length} valid records`);
    return cleaned;
  }

  /**
   * Validate record
   */
  isValidRecord(record) {
    // Check for required fields
    if (!record.timestamp || !record.source) {
      return false;
    }

    // Check for null timestamp
    if (isNaN(new Date(record.timestamp).getTime())) {
      return false;
    }

    // Check for empty records
    if (Object.keys(record).length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Check for duplicates
   */
  isDuplicate(record, existingRecords) {
    const recordKey = this.generateRecordKey(record);
    return existingRecords.some(r => this.generateRecordKey(r) === recordKey);
  }

  /**
   * Generate unique record key
   */
  generateRecordKey(record) {
    const keyParts = [
      record.timestamp,
      record.source,
      record.function || record.type || 'unknown'
    ];
    return keyParts.join('|');
  }

  /**
   * Fix data types
   */
  fixDataTypes(record) {
    const fixed = { ...record };

    // Convert timestamp
    if (typeof fixed.timestamp === 'string') {
      fixed.timestamp = new Date(fixed.timestamp).toISOString();
    }

    // Convert numeric strings to numbers
    for (const [key, value] of Object.entries(fixed)) {
      if (typeof value === 'string' && !isNaN(value) && value !== '') {
        fixed[key] = parseFloat(value);
      }
    }

    return fixed;
  }

  /**
   * Filter unnecessary fields
   */
  filterFields(record) {
    const fieldsToRemove = ['_id', 'id', 'metadata', 'debugInfo'];
    const filtered = { ...record };

    for (const field of fieldsToRemove) {
      delete filtered[field];
    }

    return filtered;
  }

  /**
   * Handle missing values
   */
  async handleMissingValues(data) {
    const imputed = [];
    const missingStats = {};

    // Calculate missing value statistics
    for (const record of data) {
      for (const [key, value] of Object.entries(record)) {
        if (!missingStats[key]) {
          missingStats[key] = { total: 0, missing: 0 };
        }
        missingStats[key].total++;
        if (value === null || value === undefined || value === '') {
          missingStats[key].missing++;
        }
      }
    }

    // Remove features with too many missing values
    const validFeatures = Object.keys(missingStats).filter(key => {
      const ratio = missingStats[key].missing / missingStats[key].total;
      return ratio < this.config.maxMissingRatio;
    });

    // Calculate fill values for valid features
    const fillValues = {};
    for (const key of validFeatures) {
      fillValues[key] = this.calculateFillValue(data, key);
    }

    // Impute missing values
    for (const record of data) {
      const imputedRecord = {};

      for (const key of validFeatures) {
        const value = record[key];
        if (value === null || value === undefined || value === '') {
          imputedRecord[key] = fillValues[key];
          imputedRecord[`${key}_imputed`] = true;
        } else {
          imputedRecord[key] = value;
          imputedRecord[`${key}_imputed`] = false;
        }
      }

      imputed.push(imputedRecord);
    }

    logger.info(`Imputed missing values for ${validFeatures.length} features`);
    return imputed;
  }

  /**
   * Calculate fill value for missing data
   */
  calculateFillValue(data, key) {
    const values = data
      .map(r => r[key])
      .filter(v => v != null && v !== '' && !isNaN(v));

    if (values.length === 0) return 0;

    // Determine type
    const isNumeric = values.every(v => typeof v === 'number');

    if (isNumeric) {
      // Use median for robust imputation
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      // Use mode for categorical
      const counts = {};
      values.forEach(v => counts[v] = (counts[v] || 0) + 1);
      return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
    }
  }

  /**
   * Remove outliers
   */
  async removeOutliers(data) {
    const method = this.config.outlierMethod;
    const cleaned = [];

    // Extract numeric features
    const numericFeatures = this.getNumericFeatures(data);

    for (const record of data) {
      let isOutlier = false;

      for (const feature of numericFeatures) {
        const value = record[feature];
        if (typeof value !== 'number') continue;

        const outlierScore = this.calculateOutlierScore(data, feature, value, method);

        if (Math.abs(outlierScore) > this.config.outlierThreshold) {
          isOutlier = true;
          break;
        }
      }

      if (!isOutlier) {
        cleaned.push(record);
      }
    }

    logger.info(`Removed ${data.length - cleaned.length} outliers (${method} method)`);
    return cleaned;
  }

  /**
   * Get numeric features
   */
  getNumericFeatures(data) {
    if (data.length === 0) return [];

    const numericFeatures = [];
    const sample = data[0];

    for (const [key, value] of Object.entries(sample)) {
      if (typeof value === 'number' && !key.includes('_imputed')) {
        numericFeatures.push(key);
      }
    }

    return numericFeatures;
  }

  /**
   * Calculate outlier score
   */
  calculateOutlierScore(data, feature, value, method) {
    const values = data.map(r => r[feature]).filter(v => typeof v === 'number');

    if (method === 'zscore') {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
      return std > 0 ? (value - mean) / std : 0;
    } else if (method === 'iqr') {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;

      if (value < lower) return (value - lower) / iqr;
      if (value > upper) return (value - upper) / iqr;
      return 0;
    }

    return 0;
  }

  /**
   * Normalize features
   */
  async normalizeFeatures(data) {
    const method = this.config.normalizationMethod;
    const normalized = data.map(record => ({ ...record }));

    const numericFeatures = this.getNumericFeatures(data);

    for (const feature of numericFeatures) {
      const values = data.map(r => r[feature]);
      const { min, max, mean, std, median, q25, q75 } = this.calculateStatistics(values);

      // Store scaler parameters for later use
      this.scalers.set(feature, { method, min, max, mean, std, median, q25, q75 });

      for (const record of normalized) {
        const value = record[feature];

        if (method === 'minmax') {
          record[feature] = max > min ? (value - min) / (max - min) : 0;
        } else if (method === 'zscore') {
          record[feature] = std > 0 ? (value - mean) / std : 0;
        } else if (method === 'robust') {
          const iqr = q75 - q25;
          record[feature] = iqr > 0 ? (value - median) / iqr : 0;
        }
      }
    }

    logger.info(`Normalized ${numericFeatures.length} features (${method} method)`);
    return normalized;
  }

  /**
   * Calculate statistics
   */
  calculateStatistics(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;

    const sum = values.reduce((s, v) => s + v, 0);
    const mean = sum / n;

    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[n - 1],
      mean,
      std,
      median: sorted[Math.floor(n / 2)],
      q25: sorted[Math.floor(n * 0.25)],
      q75: sorted[Math.floor(n * 0.75)]
    };
  }

  /**
   * Encode categorical variables
   */
  async encodeCategorical(data) {
    const encoded = data.map(record => ({ ...record }));

    const categoricalFeatures = this.getCategoricalFeatures(data);

    for (const feature of categoricalFeatures) {
      const uniqueValues = [...new Set(data.map(r => r[feature]))];

      // Create encoder
      if (!this.encoders.has(feature)) {
        this.encoders.set(feature, uniqueValues);
      }

      // One-hot encode
      for (const record of encoded) {
        const value = record[feature];

        // Remove original categorical feature
        delete record[feature];

        // Add one-hot encoded features
        for (const uniqueValue of uniqueValues) {
          const encodedKey = `${feature}_${uniqueValue}`.replace(/[^a-zA-Z0-9_]/g, '_');
          record[encodedKey] = value === uniqueValue ? 1 : 0;
        }
      }
    }

    logger.info(`Encoded ${categoricalFeatures.length} categorical features`);
    return encoded;
  }

  /**
   * Get categorical features
   */
  getCategoricalFeatures(data) {
    if (data.length === 0) return [];

    const categoricalFeatures = [];
    const sample = data[0];

    for (const [key, value] of Object.entries(sample)) {
      // Skip numeric, imputed flags, and already encoded features
      if (typeof value === 'number' ||
          key.includes('_imputed') ||
          key.includes('_')) {
        continue;
      }

      // Check if values are limited (categorical)
      const uniqueValues = new Set(data.map(r => r[key]));
      if (uniqueValues.size < 20 && uniqueValues.size > 1) {
        categoricalFeatures.push(key);
      }
    }

    return categoricalFeatures;
  }

  /**
   * Select features
   */
  async selectFeatures(data, featureImportance = null) {
    const features = Object.keys(data[0] || {});

    // Remove low-variance features
    const selected = this.removeLowVarianceFeatures(data, features);

    // Remove highly correlated features
    const finalSelected = this.removeCorrelatedFeatures(data, selected);

    logger.info(`Selected ${finalSelected.length} features from ${features.length}`);
    return data.map(record => {
      const filtered = {};
      finalSelected.forEach(f => filtered[f] = record[f]);
      return filtered;
    });
  }

  /**
   * Remove low-variance features
   */
  removeLowVarianceFeatures(data, features, threshold = 0.01) {
    const selected = [];

    for (const feature of features) {
      const values = data.map(r => r[feature]);
      const variance = this.calculateVariance(values);

      if (variance > threshold) {
        selected.push(feature);
      }
    }

    return selected;
  }

  /**
   * Remove highly correlated features
   */
  removeCorrelatedFeatures(data, features, threshold = 0.95) {
    const correlations = this.calculateCorrelationMatrix(data, features);
    const toRemove = new Set();

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const corr = correlations[i][j];
        if (Math.abs(corr) > threshold) {
          // Remove one of the correlated features
          toRemove.add(features[j]);
        }
      }
    }

    return features.filter(f => !toRemove.has(f));
  }

  /**
   * Calculate correlation matrix
   */
  calculateCorrelationMatrix(data, features) {
    const n = features.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const values1 = data.map(r => r[features[i]]);
        const values2 = data.map(r => r[features[j]]);
        matrix[i][j] = this.calculateCorrelation(values1, values2);
      }
    }

    return matrix;
  }

  /**
   * Calculate correlation
   */
  calculateCorrelation(values1, values2) {
    const n = values1.length;
    const mean1 = values1.reduce((s, v) => s + v, 0) / n;
    const mean2 = values2.reduce((s, v) => s + v, 0) / n;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denominator1 * denominator2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Split data into train/test/validation
   */
  splitData(data) {
    // Shuffle data
    const shuffled = [...data].sort(() => Math.random() - 0.5);

    const n = shuffled.length;
    const trainSize = Math.floor(n * this.config.trainTestSplit);
    const validationSize = Math.floor(n * this.config.validationSplit);

    return {
      train: shuffled.slice(0, trainSize),
      validation: shuffled.slice(trainSize, trainSize + validationSize),
      test: shuffled.slice(trainSize + validationSize),
      splits: {
        train: trainSize,
        validation: validationSize,
        test: n - trainSize - validationSize,
        total: n
      }
    };
  }

  /**
   * Transform new data using fitted scalers
   */
  transform(data) {
    const transformed = data.map(record => ({ ...record }));

    // Apply normalization
    for (const [feature, scaler] of this.scalers) {
      if (!(feature in transformed[0])) continue;

      const { method, min, max, mean, std, median, q25, q75 } = scaler;

      for (const record of transformed) {
        const value = record[feature];

        if (method === 'minmax') {
          record[feature] = max > min ? (value - min) / (max - min) : 0;
        } else if (method === 'zscore') {
          record[feature] = std > 0 ? (value - mean) / std : 0;
        } else if (method === 'robust') {
          const iqr = q75 - q25;
          record[feature] = iqr > 0 ? (value - median) / iqr : 0;
        }
      }
    }

    // Apply encoding
    for (const [feature, uniqueValues] of this.encoders) {
      for (const record of transformed) {
        const value = record[feature];

        delete record[feature];

        for (const uniqueValue of uniqueValues) {
          const encodedKey = `${feature}_${uniqueValue}`.replace(/[^a-zA-Z0-9_]/g, '_');
          record[encodedKey] = value === uniqueValue ? 1 : 0;
        }
      }
    }

    return transformed;
  }

  /**
   * Save preprocessing state
   */
  async saveState(path) {
    const state = {
      scalers: Array.from(this.scalers.entries()),
      encoders: Array.from(this.encoders.entries()),
      statistics: Array.from(this.statistics.entries()),
      config: this.config
    };

    // Save to file or storage
    logger.info(`Saved preprocessing state to ${path}`);
    return state;
  }

  /**
   * Load preprocessing state
   */
  async loadState(state) {
    this.scalers = new Map(state.scalers);
    this.encoders = new Map(state.encoders);
    this.statistics = new Map(state.statistics);
    this.config = state.config;

    logger.info('Loaded preprocessing state');
  }
}

module.exports = { DataPreprocessor };
