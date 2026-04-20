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

  /**
   * Parse natural language mood and find vault posts matching that emotional state
   */
  getVaultByMood(moodQuery, limit = 10) {
    const moodPatterns = {
      'curious but lazy': ['thoughtful', 'intriguing', 'exploratory'],
      'energetic': ['enthusiastic', 'excited', 'joyful'],
      'contemplative': ['thoughtful', 'reverent', 'calm'],
      'hungry': ['appetizing', 'enticing', 'delicious'],
      'creative': ['creative', 'artistic', 'inspiring'],
      'analytical': ['analytical', 'technical', 'detailed'],
      'inspired': ['inspired', 'motivational', 'uplifting']
    };
    const targetMoods = moodPatterns[moodQuery.toLowerCase()] || [moodQuery];

    const vault = this.loadVaultPosts();
    const scored = vault
      .map(post => ({
        post,
        moodScore: targetMoods.some(m =>
          (post.vlMood || '').toLowerCase().includes(m.toLowerCase())
        ) ? 1 : 0
      }))
      .filter(x => x.moodScore > 0)
      .slice(0, limit);

    return {
      query: moodQuery,
      matchedMoods: targetMoods,
      posts: scored.map(x => x.post),
      count: scored.length
    };
  }

  /**
   * Show what topics/interests are trending in the user's vault over time
   */
  getVaultTrends(timeRangeDays = 30) {
    const vault = this.loadVaultPosts();

    const tagCounts = {};
    vault.forEach(post => {
      (post.vlTags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const ranked = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const topTags = ranked.map(([tag, count]) => ({ tag, count }));
    const topTag = topTags[0];

    return {
      topTags,
      topTag,
      totalPosts: vault.length,
      discovery: topTag
        ? `You have ${topTag.count} posts about '${topTag.tag}' - you're clearly into that!`
        : 'Not enough data for trends yet.',
      timeRange: `${timeRangeDays} days`
    };
  }
/**
   * Find unexpected connections between two different interest areas in the vault
   */
  findCrossConnections(domain1, domain2) {
    const vault = this.loadVaultPosts();

    // Get posts for each domain
    const domain1Posts = vault.filter(p =>
      (p.vlSubject || '').toLowerCase().includes(domain1.toLowerCase()) ||
      (p.vlTags || []).some(t => t.toLowerCase().includes(domain1.toLowerCase()))
    );
    const domain2Posts = vault.filter(p =>
      (p.vlSubject || '').toLowerCase().includes(domain2.toLowerCase()) ||
      (p.vlTags || []).some(t => t.toLowerCase().includes(domain2.toLowerCase()))
    );

    // Find shared vlTags
    const tags1 = new Set(domain1Posts.flatMap(p => p.vlTags || []));
    const tags2 = new Set(domain2Posts.flatMap(p => p.vlTags || []));
    const sharedTags = [...tags1].filter(t => tags2.has(t));

    // Find shared vlStyles
    const styles1 = new Set(domain1Posts.map(p => p.vlStyle).filter(Boolean));
    const styles2 = new Set(domain2Posts.map(p => p.vlStyle).filter(Boolean));
    const sharedStyles = [...styles1].filter(s => styles2.has(s));

    return {
      domain1: { name: domain1, postCount: domain1Posts.length },
      domain2: { name: domain2, postCount: domain2Posts.length },
      sharedTags,
      sharedStyles,
      insight: sharedTags.length > 0
        ? `Your ${domain1} and ${domain2} interests connect through: ${sharedTags.slice(0, 5).join(', ')}`
        : sharedStyles.length > 0
          ? `${domain1} and ${domain2} share aesthetic styles: ${sharedStyles.slice(0, 3).join(', ')}`
          : `Your ${domain1} and ${domain2} interests connect through similar perspectives`
    };
  }

  /**
   * Turn a single bookmarked post into a structured learning path
   */
  getDeepDive(postId) {
    const vault = this.loadVaultPosts();
    const post = vault.find(p => p.id === postId || p.permalink?.includes(postId));
    if (!post) return null;

    // Find related posts by vlTags, vlSubject similarity
    const related = vault
      .filter(p => p.id !== post.id)
      .map(p => ({
        post: p,
        relevance: this.calculateRelevance(post, p)
      }))
      .filter(x => x.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    // Get knowledge graph context
    const kg = this.loadKnowledgeGraph();
    const topicNodes = kg?.nodes?.filter(n =>
      post.vlTags?.some(tag => n.name.toLowerCase().includes(tag.toLowerCase()))
    );

    return {
      anchor: {
        id: post.id,
        vlSubject: post.vlSubject,
        vlTags: post.vlTags,
        caption: post.caption?.substring(0, 100),
        url: post.permalink
      },
      learningPath: related.map(r => ({
        post: r.post,
        relevance: Math.round(r.relevance * 100) + '%',
        whyRelevant: `Matches your interest in ${r.post.vlSubject}`
      })),
      knowledgeGraphConnections: topicNodes,
      summary: `You bookmarked ${post.vlSubject}. Here are ${related.length} related posts and ${topicNodes?.length || 0} topics to explore.`
    };
  }

  /**
   * Calculate relevance score between two posts
   */
  calculateRelevance(post1, post2) {
    const tagOverlap = (post1.vlTags || []).filter(t =>
      (post2.vlTags || []).includes(t)
    ).length;
    const subjectMatch = post1.vlSubject === post2.vlSubject ? 1 : 0;
    const styleMatch = post1.vlStyle === post2.vlStyle ? 0.5 : 0;
    return (tagOverlap * 0.7) + (subjectMatch * 0.3) + styleMatch;
  }

  /**
   * Find surprising connections based on hidden gems - posts with niche tags
   */
  getSerendipity(nicheThreshold = 5) {
    const vault = this.loadVaultPosts();
    const kg = this.loadKnowledgeGraph();

    // Count tag frequencies
    const tagCounts = {};
    vault.forEach(p => (p.vlTags || []).forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }));

    // Find niche tags (appearing <= threshold times)
    const nicheTags = Object.entries(tagCounts)
      .filter(([_, count]) => count <= nicheThreshold)
      .map(([tag]) => tag);

    // Find posts with these niche tags
    const serendipityPosts = vault.filter(p =>
      (p.vlTags || []).some(t => nicheTags.includes(t))
    );

    if (serendipityPosts.length === 0) {
      return {
        discovery: null,
        message: 'Not enough niche content for serendipity right now.'
      };
    }

    // Pick a random one
    const pick = serendipityPosts[Math.floor(Math.random() * serendipityPosts.length)];
    const nicheTag = (pick.vlTags || []).find(t => nicheTags.includes(t));
    const tagCount = tagCounts[nicheTag] || 0;

    // Find related knowledge graph nodes
    const relatedKG = kg?.nodes?.filter(n =>
      n.hashtags?.some(h => nicheTags.includes(h)) ||
      (n.name && nicheTags.some(t => n.name.toLowerCase().includes(t.toLowerCase())))
    );

    return {
      discovery: {
        id: pick.id,
        vlSubject: pick.vlSubject,
        vlTags: pick.vlTags,
        vlMood: pick.vlMood,
        caption: pick.caption?.substring(0, 100),
        url: pick.permalink
      },
      whyInteresting: `Only ${tagCount} people have saved posts about '${nicheTag}' - this is rare material!`,
      relatedKnowledge: relatedKG?.slice(0, 3),
      similarHiddenGems: serendipityPosts.slice(0, 5).map(p => ({
        vlSubject: p.vlSubject,
        vlTags: p.vlTags,
        url: p.permalink
      }))
    };
  }
}

module.exports = VaultClient;
