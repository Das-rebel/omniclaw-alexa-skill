/**
 * Knowledge Graph Builder
 * Connects related information across clients for context-aware responses
 *
 * @module apps/knowledge/graph-builder
 * @version 1.0.0
 */

const { Firestore } = require('@google-cloud/firestore');

class KnowledgeGraph {
  constructor(options = {}) {
    this.firestore = new Firestore({
      projectId: options.projectId || process.env.PROJECT_ID,
    });
    this.collection = 'knowledge_graph';
  }

  /**
   * Add entity to knowledge graph
   * @param {string} userId - User identifier
   * @param {string} entityType - Entity type (person, organization, product, etc.)
   * @param {object} entity - Entity data
   * @returns {Promise<object>} - Created entity
   */
  async addEntity(userId, entityType, entity) {
    const { name, attributes, source } = entity;

    const entityRef = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('entities')
      .add({
        name,
        type: entityType,
        attributes: attributes || {},
        source: source || 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confidence: 1.0,
      });

    return {
      entityId: entityRef.id,
      name,
      type: entityType,
      status: 'created',
    };
  }

  /**
   * Add relationship between entities
   * @param {string} userId - User identifier
   * @param {string} fromEntityId - Source entity ID
   * @param {string} toEntityId - Target entity ID
   * @param {string} relationType - Relationship type (knows, works_for, bought, etc.)
   * @param {object} metadata - Relationship metadata
   * @returns {Promise<object>} - Created relationship
   */
  async addRelationship(userId, fromEntityId, toEntityId, relationType, metadata = {}) {
    const relationRef = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('relationships')
      .add({
        from: fromEntityId,
        to: toEntityId,
        type: relationType,
        metadata,
        createdAt: new Date().toISOString(),
        confidence: 1.0,
      });

    return {
      relationId: relationRef.id,
      from: fromEntityId,
      to: toEntityId,
      type: relationType,
      status: 'created',
    };
  }

  /**
   * Get entity with its relationships
   * @param {string} userId - User identifier
   * @param {string} entityId - Entity ID
   * @returns {Promise<object>} - Entity with relationships
   */
  async getEntity(userId, entityId) {
    const entityDoc = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('entities')
      .doc(entityId)
      .get();

    if (!entityDoc.exists) {
      return null;
    }

    const entity = entityDoc.data();

    // Get outgoing relationships
    const outgoingSnapshot = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('relationships')
      .where('from', '==', entityId)
      .get();

    const relationships = [];
    for (const relDoc of outgoingSnapshot.docs) {
      const rel = relDoc.data();
      const targetEntityDoc = await this.firestore
        .collection(this.collection)
        .doc(userId)
        .collection('entities')
        .doc(rel.to)
        .get();

      if (targetEntityDoc.exists) {
        relationships.push({
          relationId: relDoc.id,
          type: rel.type,
          to: {
            id: rel.to,
            name: targetEntityDoc.data().name,
            type: targetEntityDoc.data().type,
          },
          metadata: rel.metadata,
        });
      }
    }

    return {
      id: entityId,
      ...entity,
      relationships,
    };
  }

  /**
   * Search entities by name or type
   * @param {string} userId - User identifier
   * @param {object} filters - Search filters
   * @returns {Promise<Array>} - Matching entities
   */
  async searchEntities(userId, filters = {}) {
    let query = this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('entities');

    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }

    if (filters.name) {
      // Firestore doesn't support full-text search, so we filter client-side
      const snapshot = await query.get();
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(entity => entity.name.toLowerCase().includes(filters.name.toLowerCase()));
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get context for a query
   * @param {string} userId - User identifier
   * @param {string} query - Query text
   * @returns {Promise<object>} - Relevant context
   */
  async getContextForQuery(userId, query) {
    // Extract entities from query (simple NLP)
    const entities = this._extractEntities(query);

    const context = {
      entities: [],
      relationships: [],
      userPreferences: await this._getUserPreferences(userId),
    };

    for (const entityName of entities) {
      const matchingEntities = await this.searchEntities(userId, { name: entityName });

      for (const entity of matchingEntities) {
        const fullEntity = await this.getEntity(userId, entity.id);
        context.entities.push(fullEntity);
        context.relationships.push(...fullEntity.relationships);
      }
    }

    return context;
  }

  /**
   * Extract entity names from query
   * @private
   */
  _extractEntities(query) {
    // Simple entity extraction (capitalize words that might be names)
    const words = query.split(/\s+/);
    const entities = [];

    for (const word of words) {
      // Capitalized words might be names
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) {
        entities.push(word);
      }
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Get user preferences
   * @private
   */
  async _getUserPreferences(userId) {
    const doc = await this.firestore
      .collection('users')
      .doc(userId)
      .get();

    if (!doc.exists) {
      return {};
    }

    return doc.data().preferences || {};
  }

  /**
   * Build knowledge graph from email data
   * @param {string} userId - User identifier
   * @param {Array<object>} emails - Array of emails
   * @returns {Promise<object>} - Build result
   */
  async buildFromEmails(userId, emails) {
    let entitiesCreated = 0;
    let relationshipsCreated = 0;

    for (const email of emails) {
      // Add sender as entity
      const senderEntity = await this._findOrCreateEntity(userId, 'person', {
        name: email.sender.name,
        attributes: {
          email: email.sender.email,
          source: 'email',
        },
        source: 'email',
      });

      // Add recipients as entities
      for (const recipient of email.recipients || []) {
        const recipientEntity = await this._findOrCreateEntity(userId, 'person', {
          name: recipient.name,
          attributes: {
            email: recipient.email,
            source: 'email',
          },
          source: 'email',
        });

        // Add relationship: sender -> recipient
        await this.addRelationship(userId, senderEntity.id, recipientEntity.id, 'emailed', {
          subject: email.subject,
          date: email.date,
        });

        relationshipsCreated++;
      }

      entitiesCreated++;
    }

    return {
      entitiesCreated,
      relationshipsCreated,
      status: 'success',
    };
  }

  /**
   * Build knowledge graph from price tracking data
   * @param {string} userId - User identifier
   * @param {Array<object>} products - Array of tracked products
   * @returns {Promise<object>} - Build result
   */
  async buildFromPriceTracking(userId, products) {
    let entitiesCreated = 0;
    let relationshipsCreated = 0;

    for (const product of products) {
      // Add product as entity
      const productEntity = await this._findOrCreateEntity(userId, 'product', {
        name: product.name,
        attributes: {
          url: product.url,
          platform: product.platform,
          category: product.category,
        },
        source: 'price_tracking',
      });

      // Add platform as entity
      const platformEntity = await this._findOrCreateEntity(userId, 'organization', {
        name: product.platform,
        attributes: {
          type: 'e-commerce',
        },
        source: 'price_tracking',
      });

      // Add relationship: product -> platform
      await this.addRelationship(userId, productEntity.id, platformEntity.id, 'sold_on', {
        price: product.currentPrice,
        trackedSince: product.trackedSince,
      });

      entitiesCreated += 2;
      relationshipsCreated++;
    }

    return {
      entitiesCreated,
      relationshipsCreated,
      status: 'success',
    };
  }

  /**
   * Build knowledge graph from media data
   * @param {string} userId - User identifier
   * @param {Array<object>} mediaItems - Array of media items
   * @returns {Promise<object>} - Build result
   */
  async buildFromMedia(userId, mediaItems) {
    let entitiesCreated = 0;
    let relationshipsCreated = 0;

    // Group by artist to create artist entities
    const artists = {};

    for (const item of mediaItems) {
      if (!artists[item.artist]) {
        artists[item.artist] = [];
      }
      artists[item.artist].push(item);
    }

    for (const [artistName, items] of Object.entries(artists)) {
      // Add artist as entity
      const artistEntity = await this._findOrCreateEntity(userId, 'person', {
        name: artistName,
        attributes: {
          type: 'artist',
          source: 'media',
        },
        source: 'media',
      });

      // Add tracks/songs as entities
      for (const item of items) {
        const trackEntity = await this._findOrCreateEntity(userId, 'content', {
          name: item.name,
          attributes: {
            type: item.type, // track, album, video
            platform: item.platform,
          },
          source: 'media',
        });

        // Add relationship: artist -> track
        await this.addRelationship(userId, artistEntity.id, trackEntity.id, 'created', {
          releaseDate: item.releaseDate,
          playCount: item.playCount,
        });

        entitiesCreated++;
        relationshipsCreated++;
      }

      entitiesCreated++;
    }

    return {
      entitiesCreated,
      relationshipsCreated,
      status: 'success',
    };
  }

  /**
   * Find or create entity
   * @private
   */
  async _findOrCreateEntity(userId, type, data) {
    // Try to find existing entity
    const existing = await this.searchEntities(userId, {
      name: data.name,
      type,
    });

    if (existing.length > 0) {
      return { id: existing[0].id, ...existing[0] };
    }

    // Create new entity
    return await this.addEntity(userId, type, data);
  }

  /**
   * Get recommendations based on knowledge graph
   * @param {string} userId - User identifier
   * @param {string} entityType - Entity type to get recommendations for
   * @returns {Promise<Array>} - Recommended entities
   */
  async getRecommendations(userId, entityType) {
    const entities = await this.searchEntities(userId, { type: entityType });
    const recommendations = [];

    // Simple collaborative filtering: find entities related to highly-connected entities
    for (const entity of entities) {
      const fullEntity = await this.getEntity(userId, entity.id);

      if (fullEntity.relationships.length > 0) {
        recommendations.push({
          ...entity,
          score: fullEntity.relationships.length,
          reason: `Connected to ${fullEntity.relationships.length} other entities`,
        });
      }
    }

    // Sort by score and return top 10
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, 10);
  }

  /**
   * Update entity confidence score
   * @param {string} userId - User identifier
   * @param {string} entityId - Entity ID
   * @param {number} delta - Confidence change
   * @returns {Promise<object>} - Updated entity
   */
  async updateConfidence(userId, entityId, delta) {
    const entityRef = this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('entities')
      .doc(entityId);

    const entityDoc = await entityRef.get();
    if (!entityDoc.exists) {
      throw new Error('Entity not found');
    }

    const currentConfidence = entityDoc.data().confidence || 0.5;
    const newConfidence = Math.max(0, Math.min(1, currentConfidence + delta));

    await entityRef.update({
      confidence: newConfidence,
      updatedAt: new Date().toISOString(),
    });

    return {
      entityId,
      confidence: newConfidence,
      status: 'updated',
    };
  }

  /**
   * Prune low-confidence entities
   * @param {string} userId - User identifier
   * @param {number} threshold - Confidence threshold (default: 0.3)
   * @returns {Promise<object>} - Prune result
   */
  async pruneLowConfidence(userId, threshold = 0.3) {
    const snapshot = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('entities')
      .where('confidence', '<', threshold)
      .get();

    let prunedCount = 0;

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
      prunedCount++;
    }

    return {
      prunedCount,
      threshold,
      status: 'success',
    };
  }

  /**
   * Export knowledge graph
   * @param {string} userId - User identifier
   * @returns {Promise<object>} - Exported graph
   */
  async exportGraph(userId) {
    const entitiesSnapshot = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('entities')
      .get();

    const relationshipsSnapshot = await this.firestore
      .collection(this.collection)
      .doc(userId)
      .collection('relationships')
      .get();

    return {
      userId,
      exportedAt: new Date().toISOString(),
      entities: entitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      relationships: relationshipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    };
  }
}

module.exports = KnowledgeGraph;
