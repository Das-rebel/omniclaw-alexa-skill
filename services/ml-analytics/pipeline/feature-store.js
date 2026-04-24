/**
 * Feature Store - Manage and version ML features
 *
 * Provides:
 * - Feature storage and retrieval
 * - Feature versioning
 * - Feature lineage tracking
 * - Feature caching
 * - Feature monitoring
 *
 * Target: 350+ lines of feature store logic
 */

const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const { logger } = require('../../logging/logger');
const Redis = require('redis');

class FeatureStore {
  constructor(config = {}) {
    this.firestore = new Firestore();
    this.storage = new Storage();

    this.config = {
      featuresCollection: config.featuresCollection || 'ml_features',
      featureSetsCollection: config.featureSetsCollection || 'ml_feature_sets',
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600, // 1 hour
      storageBucket: config.storageBucket || 'omniclaw-ml-features',
      ...config
    };

    this.redis = null;
    if (this.config.cacheEnabled) {
      this.initializeCache();
    }
  }

  /**
   * Initialize Redis cache
   */
  async initializeCache() {
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await this.redis.connect();
      logger.info('Feature store cache initialized');
    } catch (error) {
      logger.warn('Failed to initialize feature store cache:', error);
      this.config.cacheEnabled = false;
    }
  }

  /**
   * Store features
   */
  async storeFeatures(features, metadata = {}) {
    try {
      const featureId = this.generateFeatureId();

      const featureDoc = {
        id: featureId,
        features,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          featureCount: Object.keys(features).length
        },
        version: 1
      };

      // Store in Firestore
      await this.firestore
        .collection(this.config.featuresCollection)
        .doc(featureId)
        .set(featureDoc);

      // Cache features
      if (this.config.cacheEnabled) {
        await this.cacheFeatures(featureId, features);
      }

      // Store in Cloud Storage for long-term backup
      await this.backupFeatures(featureId, features);

      logger.info(`Stored features: ${featureId} (${Object.keys(features).length} features)`);
      return featureId;

    } catch (error) {
      logger.error('Error storing features:', error);
      throw error;
    }
  }

  /**
   * Retrieve features
   */
  async getFeatures(featureId) {
    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.getCachedFeatures(featureId);
        if (cached) {
          return cached;
        }
      }

      // Retrieve from Firestore
      const doc = await this.firestore
        .collection(this.config.featuresCollection)
        .doc(featureId)
        .get();

      if (!doc.exists) {
        throw new Error(`Feature set not found: ${featureId}`);
      }

      const data = doc.data();

      // Cache for future requests
      if (this.config.cacheEnabled) {
        await this.cacheFeatures(featureId, data.features);
      }

      return data.features;

    } catch (error) {
      logger.error(`Error retrieving features ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Store feature set (group of features for training)
   */
  async storeFeatureSet(featuresList, metadata = {}) {
    try {
      const featureSetId = this.generateFeatureSetId();

      const featureSetDoc = {
        id: featureSetId,
        featureIds: featuresList.map(f => f.id),
        count: featuresList.length,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          totalFeatures: featuresList.reduce((sum, f) => sum + f.featureCount, 0)
        },
        version: 1
      };

      // Store in Firestore
      await this.firestore
        .collection(this.config.featureSetsCollection)
        .doc(featureSetId)
        .set(featureSetDoc);

      logger.info(`Stored feature set: ${featureSetId} (${featuresList.length} feature sets)`);
      return featureSetId;

    } catch (error) {
      logger.error('Error storing feature set:', error);
      throw error;
    }
  }

  /**
   * Retrieve feature set
   */
  async getFeatureSet(featureSetId) {
    try {
      const doc = await this.firestore
        .collection(this.config.featureSetsCollection)
        .doc(featureSetId)
        .get();

      if (!doc.exists) {
        throw new Error(`Feature set not found: ${featureSetId}`);
      }

      const data = doc.data();

      // Retrieve all features in the set
      const features = await Promise.all(
        data.featureIds.map(id => this.getFeatures(id))
      );

      return {
        ...data,
        features
      };

    } catch (error) {
      logger.error(`Error retrieving feature set ${featureSetId}:`, error);
      throw error;
    }
  }

  /**
   * Get latest features
   */
  async getLatestFeatures(limit = 100) {
    try {
      const snapshot = await this.firestore
        .collection(this.config.featuresCollection)
        .orderBy('metadata.createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error retrieving latest features:', error);
      return [];
    }
  }

  /**
   * Get features by date range
   */
  async getFeaturesByDateRange(startDate, endDate) {
    try {
      const snapshot = await this.firestore
        .collection(this.config.featuresCollection)
        .where('metadata.createdAt', '>=', startDate.toISOString())
        .where('metadata.createdAt', '<=', endDate.toISOString())
        .orderBy('metadata.createdAt')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error retrieving features by date range:', error);
      return [];
    }
  }

  /**
   * Update features (create new version)
   */
  async updateFeatures(featureId, newFeatures, metadata = {}) {
    try {
      const doc = await this.firestore
        .collection(this.config.featuresCollection)
        .doc(featureId)
        .get();

      if (!doc.exists) {
        throw new Error(`Feature set not found: ${featureId}`);
      }

      const oldData = doc.data();
      const newVersion = (oldData.version || 0) + 1;

      // Archive old version
      await this.archiveFeatureVersion(featureId, oldData.version, oldData);

      // Update with new features
      const updatedDoc = {
        ...oldData,
        features: newFeatures,
        version: newVersion,
        metadata: {
          ...oldData.metadata,
          ...metadata,
          updatedAt: new Date().toISOString(),
          featureCount: Object.keys(newFeatures).length
        }
      };

      await this.firestore
        .collection(this.config.featuresCollection)
        .doc(featureId)
        .set(updatedDoc);

      // Update cache
      if (this.config.cacheEnabled) {
        await this.cacheFeatures(featureId, newFeatures);
      }

      logger.info(`Updated features: ${featureId} (version ${newVersion})`);
      return { version: newVersion, id: featureId };

    } catch (error) {
      logger.error(`Error updating features ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Archive feature version
   */
  async archiveFeatureVersion(featureId, version, data) {
    try {
      const archiveId = `${featureId}_v${version}`;

      await this.firestore
        .collection('ml_features_archive')
        .doc(archiveId)
        .set({
          ...data,
          archivedAt: new Date().toISOString()
        });

      logger.debug(`Archived feature version: ${archiveId}`);

    } catch (error) {
      logger.warn(`Failed to archive feature version ${featureId} v${version}:`, error);
    }
  }

  /**
   * Get feature lineage
   */
  async getFeatureLineage(featureId) {
    try {
      const lineage = [];

      // Get current version
      const currentDoc = await this.firestore
        .collection(this.config.featuresCollection)
        .doc(featureId)
        .get();

      if (currentDoc.exists) {
        lineage.push({
          version: currentDoc.data().version,
          createdAt: currentDoc.data().metadata.createdAt,
          isCurrent: true
        });
      }

      // Get archived versions
      const archiveSnapshot = await this.firestore
        .collection('ml_features_archive')
        .where('__name__', '>=', featureId)
        .where('__name__', '<', featureId + '\uf8ff')
        .get();

      archiveSnapshot.forEach(doc => {
        const data = doc.data();
        const versionMatch = doc.id.match(/_v(\d+)$/);
        if (versionMatch) {
          lineage.push({
            version: parseInt(versionMatch[1]),
            createdAt: data.metadata?.createdAt || data.createdAt,
            archivedAt: data.archivedAt,
            isCurrent: false
          });
        }
      });

      return lineage.sort((a, b) => b.version - a.version);

    } catch (error) {
      logger.error(`Error getting feature lineage for ${featureId}:`, error);
      return [];
    }
  }

  /**
   * Monitor feature quality
   */
  async monitorFeatures(featureId) {
    try {
      const features = await this.getFeatures(featureId);

      const metrics = {
        id: featureId,
        timestamp: new Date().toISOString(),
        featureCount: Object.keys(features).length,
        missingValues: 0,
        nullValues: 0,
        infinityValues: 0,
        nanValues: 0,
        numericFeatures: 0,
        categoricalFeatures: 0
      };

      for (const [key, value] of Object.entries(features)) {
        if (value === null || value === undefined) {
          metrics.nullValues++;
        } else if (value === Infinity || value === -Infinity) {
          metrics.infinityValues++;
        } else if (typeof value === 'number' && isNaN(value)) {
          metrics.nanValues++;
        } else if (typeof value === 'number') {
          metrics.numericFeatures++;
        } else {
          metrics.categoricalFeatures++;
        }
      }

      metrics.qualityScore = this.calculateQualityScore(metrics);

      // Store monitoring metrics
      await this.firestore
        .collection('ml_feature_quality')
        .doc(`${featureId}_${Date.now()}`)
        .set(metrics);

      return metrics;

    } catch (error) {
      logger.error(`Error monitoring features ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate quality score
   */
  calculateQualityScore(metrics) {
    const totalFeatures = metrics.featureCount;
    if (totalFeatures === 0) return 0;

    const issues = metrics.nullValues + metrics.infinityValues + metrics.nanValues;
    const qualityRatio = 1 - (issues / totalFeatures);

    return Math.max(0, Math.min(100, qualityRatio * 100));
  }

  /**
   * Cache features
   */
  async cacheFeatures(featureId, features) {
    if (!this.redis) return;

    try {
      const key = `features:${featureId}`;
      const value = JSON.stringify(features);

      await this.redis.setEx(key, this.config.cacheTTL, value);
      logger.debug(`Cached features: ${featureId}`);

    } catch (error) {
      logger.warn(`Failed to cache features ${featureId}:`, error);
    }
  }

  /**
   * Get cached features
   */
  async getCachedFeatures(featureId) {
    if (!this.redis) return null;

    try {
      const key = `features:${featureId}`;
      const value = await this.redis.get(key);

      if (value) {
        return JSON.parse(value);
      }

      return null;

    } catch (error) {
      logger.warn(`Failed to get cached features ${featureId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(featureId) {
    if (!this.redis) return;

    try {
      const key = `features:${featureId}`;
      await this.redis.del(key);
      logger.debug(`Invalidated cache for: ${featureId}`);

    } catch (error) {
      logger.warn(`Failed to invalidate cache for ${featureId}:`, error);
    }
  }

  /**
   * Backup features to Cloud Storage
   */
  async backupFeatures(featureId, features) {
    try {
      const filename = `features/${featureId}.json`;
      const file = this.storage.bucket(this.config.storageBucket).file(filename);

      await file.save(JSON.stringify(features, null, 2));
      logger.debug(`Backed up features: ${filename}`);

    } catch (error) {
      logger.warn(`Failed to backup features ${featureId}:`, error);
    }
  }

  /**
   * Restore features from backup
   */
  async restoreFeatures(featureId) {
    try {
      const filename = `features/${featureId}.json`;
      const file = this.storage.bucket(this.config.storageBucket).file(filename);

      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`Backup not found: ${filename}`);
      }

      const contents = await file.download();
      return JSON.parse(contents.toString());

    } catch (error) {
      logger.error(`Failed to restore features ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Delete features
   */
  async deleteFeatures(featureId) {
    try {
      // Delete from Firestore
      await this.firestore
        .collection(this.config.featuresCollection)
        .doc(featureId)
        .delete();

      // Invalidate cache
      await this.invalidateCache(featureId);

      logger.info(`Deleted features: ${featureId}`);

    } catch (error) {
      logger.error(`Error deleting features ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * List all features
   */
  async listFeatures(options = {}) {
    try {
      let query = this.firestore.collection(this.config.featuresCollection);

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.orderDirection || 'desc');
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error listing features:', error);
      return [];
    }
  }

  /**
   * Get feature statistics
   */
  async getFeatureStatistics() {
    try {
      const featuresCollection = await this.firestore
        .collection(this.config.featuresCollection)
        .get();

      const featureSetsCollection = await this.firestore
        .collection(this.config.featureSetsCollection)
        .get();

      return {
        totalFeatureSets: featuresCollection.size,
        totalFeatures: featureSetsCollection.size,
        totalFeaturesStored: featuresCollection.docs.reduce(
          (sum, doc) => sum + (doc.data().metadata?.featureCount || 0),
          0
        ),
        cacheEnabled: this.config.cacheEnabled,
        storageBucket: this.config.storageBucket
      };

    } catch (error) {
      logger.error('Error getting feature statistics:', error);
      return {};
    }
  }

  /**
   * Generate feature ID
   */
  generateFeatureId() {
    return `feat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate feature set ID
   */
  generateFeatureSetId() {
    return `fset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close connections
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Feature store cache connection closed');
    }
  }
}

module.exports = { FeatureStore };
