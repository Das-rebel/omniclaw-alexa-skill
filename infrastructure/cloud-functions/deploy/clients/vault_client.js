/**
 * Vault Client - Your Personal Knowledge Graph
 *
 * The vault is your curated knowledge base - bookmarked content enriched with
 * VL tags forming a searchable knowledge graph. This client transforms passive
 * bookmarks into active knowledge leverage.
 *
 * Vault contains:
 * - Topics: AI, Python, Design, etc.
 * - Skills: Programming, Graphic Design, etc.
 * - Places: Restaurants, locations
 * - Food: Cuisines, dishes
 * - Relationships: Cross-platform connections
 */

const path = require('path');
const fs = require('fs');

class VaultClient {
  constructor(options = {}) {
    this.knowledgeGraphPath = options.knowledgeGraphPath ||
      path.join(__dirname, '../learning_base/unified_knowledge_graph.json');
    this.vaultPath = options.vaultPath ||
      path.join(__dirname, '../learning_base/instagram_scrape.json');
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Load knowledge graph from local storage
   */
  loadKnowledgeGraph() {
    const cacheKey = 'knowledge_graph';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      if (fs.existsSync(this.knowledgeGraphPath)) {
        const data = JSON.parse(fs.readFileSync(this.knowledgeGraphPath, 'utf8'));
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.error('[VaultClient] Error loading knowledge graph:', error.message);
    }

    return null;
  }

  /**
   * Load vault posts
   */
  loadVaultPosts() {
    const cacheKey = 'vault_posts';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      if (fs.existsSync(this.vaultPath)) {
        const data = JSON.parse(fs.readFileSync(this.vaultPath, 'utf8'));
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.error('[VaultClient] Error loading vault:', error.message);
    }

    return [];
  }

  /**
   * Find topics and skills matching a query
   */
  findKnowledge(query) {
    const kg = this.loadKnowledgeGraph();
    if (!kg) return { topics: [], skills: [], places: [], food: [] };

    const queryLower = query.toLowerCase();
    const results = {
      topics: [],
      skills: [],
      places: [],
      food: [],
      relationships: []
    };

    // Search nodes
    for (const node of (kg.nodes || [])) {
      const nameLower = node.name.toLowerCase();
      const typeLower = node.type.toLowerCase();

      if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
        if (typeLower === 'topic') results.topics.push(node);
        else if (typeLower === 'skill') results.skills.push(node);
        else if (typeLower === 'place') results.places.push(node);
        else if (typeLower === 'food' || typeLower === 'cuisine') results.food.push(node);
      }
    }

    // Search relationships
    for (const rel of (kg.relationships || [])) {
      if (rel.type.includes(queryLower)) {
        results.relationships.push(rel);
      }
    }

    return results;
  }

  /**
   * Get a topic with its related knowledge
   */
  getTopicWithContext(topicName) {
    const kg = this.loadKnowledgeGraph();
    if (!kg) return null;

    // Find the topic node
    const topic = kg.nodes?.find(n =>
      n.name.toLowerCase() === topicName.toLowerCase() ||
      n.id.toLowerCase().includes(topicName.toLowerCase())
    );

    if (!topic) return null;

    // Find related nodes
    const related = kg.relationships
      ?.filter(r => r.from === topic.id || r.to === topic.id)
      ?.map(r => {
        const relatedId = r.from === topic.id ? r.to : r.from;
        return kg.nodes?.find(n => n.id === relatedId);
      })
      ?.filter(Boolean);

    return {
      ...topic,
      related,
      relationships: kg.relationships?.filter(r =>
        r.from === topic.id || r.to === topic.id
      )
    };
  }

  /**
   * Get food/place recommendations
   */
  getFoodRecommendations(cuisineOrDish) {
    const kg = this.loadKnowledgeGraph();
    if (!kg) return { restaurants: [], dishes: [], cuisine: null };

    // Find cuisine or dish
    const cuisine = kg.nodes?.find(n =>
      n.type === 'cuisine' &&
      (n.name.toLowerCase().includes(cuisineOrDish.toLowerCase()) ||
       cuisineOrDish.toLowerCase().includes(n.name.toLowerCase()))
    );

    const dishes = kg.nodes?.filter(n =>
      n.type === 'food' &&
      (n.name.toLowerCase().includes(cuisineOrDish.toLowerCase()) ||
       n.hashtags?.some(t => t.toLowerCase().includes(cuisineOrDish.toLowerCase())))
    );

    const restaurants = kg.nodes?.filter(n =>
      n.type === 'place' &&
      (n.name.toLowerCase().includes(cuisineOrDish.toLowerCase()) ||
       n.hashtags?.some(t => t.toLowerCase().includes(cuisineOrDish.toLowerCase())))
    );

    // Find relationships
    const dishToRestaurant = [];
    if (cuisine) {
      const rels = kg.relationships?.filter(r =>
        (r.from === cuisine.id || r.to === cuisine.id)
      );
      rels?.forEach(r => {
        const relatedId = r.from === cuisine.id ? r.to : r.from;
        const related = kg.nodes?.find(n => n.id === relatedId);
        if (related?.type === 'place') {
          dishToRestaurant.push({ place: related, relationship: r.type });
        }
      });
    }

    return {
      cuisine,
      dishes: dishes || [],
      restaurants: restaurants || [],
      dishToRestaurant,
      source: 'knowledge_graph'
    };
  }

  /**
   * Get skill learning path
   */
  getSkillLearningPath(skillName) {
    const kg = this.loadKnowledgeGraph();
    if (!kg) return null;

    // Find the skill
    const skill = kg.nodes?.find(n =>
      n.type === 'skill' &&
      (n.name.toLowerCase().includes(skillName.toLowerCase()) ||
       n.id.toLowerCase().includes(skillName.toLowerCase()))
    );

    if (!skill) return null;

    // Find related topics (learning prerequisites)
    const relatedTopics = kg.relationships
      ?.filter(r => r.from === skill.id || r.to === skill.id)
      ?.map(r => {
        const relatedId = r.from === skill.id ? r.to : r.from;
        return kg.nodes?.find(n => n.id === relatedId);
      })
      ?.filter(n => n?.type === 'topic');

    // Get vault posts about this skill
    const vault = this.loadVaultPosts();
    const skillPosts = (vault || [])
      .filter(post => {
        const text = `${post.text || ''} ${post.vlTags?.join(' ') || ''}`.toLowerCase();
        return text.includes(skill.name.toLowerCase());
      })
      .slice(0, 10);

    return {
      skill,
      relatedTopics: relatedTopics || [],
      recommendedPosts: skillPosts,
      estimatedLearnTime: this.estimateLearnTime(skill.name)
    };
  }

  /**
   * Estimate learning time based on skill complexity
   */
  estimateLearnTime(skillName) {
    const skillLower = skillName.toLowerCase();
    if (skillLower.includes('python') || skillLower.includes('programming')) {
      return '3-6 months';
    }
    if (skillLower.includes('design') || skillLower.includes('graphic')) {
      return '6-12 months';
    }
    if (skillLower.includes('ai') || skillLower.includes('machine learning')) {
      return '12-18 months';
    }
    return '3-6 months';
  }

  /**
   * Get random insight from vault
   */
  getRandomInsight() {
    const kg = this.loadKnowledgeGraph();
    if (!kg || !kg.nodes || kg.nodes.length === 0) return null;

    const randomNode = kg.nodes[Math.floor(Math.random() * kg.nodes.length)];
    const related = kg.relationships
      ?.filter(r => r.from === randomNode.id || r.to === randomNode.id)
      ?.map(r => {
        const relatedId = r.from === randomNode.id ? r.to : r.from;
        return kg.nodes?.find(n => n.id === relatedId);
      })
      ?.filter(Boolean);

    return {
      node: randomNode,
      related: related || [],
      fact: this.generateInsightText(randomNode)
    };
  }

  /**
   * Generate human-readable insight text
   */
  generateInsightText(node) {
    switch (node.type) {
      case 'topic':
        return `You have ${node.mentions || 0} saved items about ${node.name}`;
      case 'skill':
        return `Your ${node.name} skill level appears to be growing - ${node.mentions || 0} related saves`;
      case 'food':
        return `${node.name}: ${node.caption?.substring(0, 100)}...`;
      case 'cuisine':
        return `${node.name} cuisine is well-represented in your vault`;
      case 'place':
        return `${node.name} - ${node.caption?.substring(0, 80)}...`;
      default:
        return `${node.name} is in your personal knowledge graph`;
    }
  }

  /**
   * Connect two topics from your vault
   */
  connectTheDots(topic1, topic2) {
    const kg = this.loadKnowledgeGraph();
    if (!kg) return null;

    const node1 = kg.nodes?.find(n =>
      n.name.toLowerCase().includes(topic1.toLowerCase())
    );
    const node2 = kg.nodes?.find(n =>
      n.name.toLowerCase().includes(topic2.toLowerCase())
    );

    if (!node1 || !node2) {
      return { connected: false, path: null };
    }

    // Find direct relationship
    const directRel = kg.relationships?.find(r =>
      (r.from === node1.id && r.to === node2.id) ||
      (r.from === node2.id && r.to === node1.id)
    );

    if (directRel) {
      return {
        connected: true,
        type: directRel.type,
        strength: directRel.strength,
        path: [node1, directRel, node2]
      };
    }

    // Find indirect path (through common nodes)
    const node1Rels = kg.relationships?.filter(r =>
      r.from === node1.id || r.to === node1.id
    );
    const node2Rels = kg.relationships?.filter(r =>
      r.from === node2.id || r.to === node2.id
    );

    const node1RelatedIds = new Set([
      ...node1Rels?.map(r => r.from === node1.id ? r.to : r.from) || []
    ]);
    const common = node2Rels?.find(r => {
      const relatedId = r.from === node2.id ? r.to : r.from;
      return node1RelatedIds.has(relatedId);
    });

    if (common) {
      const middleId = common.from === node2.id ? common.to : common.from;
      const middleNode = kg.nodes?.find(n => n.id === middleId);
      return {
        connected: true,
        type: 'indirect',
        path: [node1, middleNode, node2],
        explanation: `${node1.name} connects to ${node2.name} through ${middleNode?.name}`
      };
    }

    return {
      connected: false,
      path: null,
      suggestion: `No relationship found between ${node1.name} and ${node2.name} in your vault`
    };
  }

  /**
   * Get vault statistics
   */
  getStats() {
    const kg = this.loadKnowledgeGraph();
    const vault = this.loadVaultPosts();

    const stats = {
      knowledgeGraph: {
        totalNodes: kg?.nodes?.length || 0,
        topics: kg?.nodes?.filter(n => n.type === 'topic').length || 0,
        skills: kg?.nodes?.filter(n => n.type === 'skill').length || 0,
        places: kg?.nodes?.filter(n => n.type === 'place').length || 0,
        food: kg?.nodes?.filter(n => n.type === 'food' || n.type === 'cuisine').length || 0,
        relationships: kg?.relationships?.length || 0
      },
      vault: {
        totalPosts: Array.isArray(vault) ? vault.length : 0,
        lastUpdated: kg?.metadata?.lastUpdated || null
      }
    };

    return stats;
  }
}

module.exports = VaultClient;
