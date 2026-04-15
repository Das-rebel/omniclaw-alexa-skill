/**
 * Resilient Client Wrapper
 * Wraps all preserved OpenClaw clients with resilience patterns
 *
 * LAZY LOADING: Clients are loaded on first use, not at module load time.
 * This enables safe deletion of unused client files without breaking the module.
 */

const { protectAllClients, getHealthStatus, getResilienceStats } = require('./shared/resilience/index');

/**
 * Client registry - maps client names to their module paths
 * Add/remove entries here to enable/disable clients without breaking the module
 */
const CLIENT_REGISTRY = {
  ArxivClient: './clients/arxiv_client',
  CerebrasClient: './clients/cerebras_client',
  GeminaClient: './clients/gemini_client',
  GeminiClient: './clients/gemini_client',
  GLMClient: './clients/glm_client',
  GoogleTranslateClient: './clients/google_translate_client',
  GoogleTTSClient: './clients/google_tts_client',
  GroqClient: './clients/groq_client',
  NewsClient: './clients/news_client',
  PerplexityClient: './clients/perplexity_client',
  RedditClient: './clients/reddit_client',
  SarvamClient: './clients/sarvam_client',
  SarvamTTSSClient: './clients/sarvam_tts_client',
  TavilyClient: './clients/tavily_client',
  TMLPDClient: './clients/tmlpd_client',
  TMLPDQueryClient: './clients/tmlpd_query_client',
  TwitterClient: './clients/twitter_client',
  UnifiedGLMClient: './clients/unified_glm_client',
  UnifiedAIClient: './clients/unified_ai_client',
  WikipediaClient: './clients/wikipedia_client',
  YouTubeClient: './clients/youtube_client',
  SpotifyClient: './clients/spotify_client',
  WhatsAppClient: './clients/whatsapp_client',
  KodiClient: './clients/kodi_client',
  BaileysWhatsAppClient: './clients/baileys_whatsapp_client'
};

/**
 * Lazy-loaded client cache
 * Clients are instantiated on first access and cached
 */
const clientCache = {
  original: {},
  protected: {}
};

/**
 * Get a client instance (lazy loading)
 * @param {string} clientName - Name of the client
 * @returns {Object} - Client instance
 */
function instantiateClient(clientName) {
  const path = CLIENT_REGISTRY[clientName];
  if (!path) {
    throw new Error(`Unknown client: ${clientName}`);
  }
  const ClientClass = require(path);
  return new ClientClass();
}

/**
 * Collection of all original (unprotected) clients
 * Lazy-loaded on first access
 */
const originalClients = new Proxy({}, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    if (prop in CLIENT_REGISTRY) {
      const client = instantiateClient(prop);
      target[prop] = client;
      return client;
    }
    return undefined;
  },
  has(target, prop) {
    return prop in CLIENT_REGISTRY;
  },
  ownKeys(target) {
    return Object.keys(CLIENT_REGISTRY);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop in CLIENT_REGISTRY) {
      return { enumerable: true, configurable: true };
    }
    return undefined;
  }
});

/**
 * Collection of all protected (resilience-wrapped) clients
 * Lazy-loaded on first access
 */
const protectedClients = new Proxy({}, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    if (prop in CLIENT_REGISTRY) {
      // Get original (creates and caches it)
      const original = originalClients[prop];
      // Create protected version
      const protected_version = protectAllClients({ [prop]: original })[prop];
      target[prop] = protected_version;
      return protected_version;
    }
    return undefined;
  },
  has(target, prop) {
    return prop in CLIENT_REGISTRY;
  },
  ownKeys(target) {
    return Object.keys(CLIENT_REGISTRY);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop in CLIENT_REGISTRY) {
      return { enumerable: true, configurable: true };
    }
    return undefined;
  }
});

/**
 * Get a client (protected by default)
 *
 * @param {string} clientName - Name of the client
 * @param {boolean} useProtected - Use protected version (default: true)
 * @returns {Object} - Client instance
 */
function getClient(clientName, useProtected = true) {
  const key = clientName.charAt(0).toUpperCase() + clientName.slice(1);

  if (useProtected) {
    if (!(key in protectedClients)) {
      throw new Error(`Unknown client: ${clientName}`);
    }
    return protectedClients[key];
  } else {
    if (!(key in originalClients)) {
      throw new Error(`Unknown client: ${clientName}`);
    }
    return originalClients[key];
  }
}

/**
 * Get all protected clients
 * @returns {Object} - All protected clients
 */
function getAllClients() {
  return protectedClients;
}

/**
 * Get all original (unprotected) clients
 * Use this for testing or when you need raw access
 * @returns {Object} - All original clients
 */
function getOriginalClients() {
  return originalClients;
}

/**
 * Test if a client is available and healthy
 * @param {string} clientName - Name of the client
 * @returns {Promise<boolean>} - True if client is healthy
 */
async function testClientHealth(clientName) {
  try {
    const client = getClient(clientName);

    // Try a simple operation (method varies by client)
    if (typeof client.healthCheck === 'function') {
      await client.healthCheck();
    } else if (typeof client.search === 'function') {
      await client.search('test');
    } else if (typeof client.query === 'function') {
      await client.query('test');
    } else {
      // No test method available, assume healthy
      return true;
    }

    return true;
  } catch (error) {
    console.error(`Client ${clientName} health check failed:`, error.message);
    return false;
  }
}

/**
 * Get comprehensive health report for all clients
 * @returns {Promise<Object>} - Health report
 */
async function getHealthReport() {
  const report = {
    timestamp: new Date().toISOString(),
    resilience: getResilienceStats(),
    clients: {}
  };

  // Test each client
  for (const clientName of Object.keys(originalClients)) {
    report.clients[clientName] = {
      protected: clientName in protectedClients,
      healthy: await testClientHealth(clientName)
    };
  }

  return report;
}

/**
 * Create a fallback chain for a specific operation
 * Useful when you want to try multiple clients for the same operation
 *
 * @param {string} operation - Operation name (e.g., 'search', 'query')
 * @param {Array<string>} clientNames - Array of client names to try
 * @returns {Function} - Function that executes the operation with fallback
 */
function createFallbackChain(operation, clientNames) {
  return async function(...args) {
    const { withFallbackChain } = require('../shared/resilience/index');

    const fallbacks = clientNames.map(name => {
      const client = getClient(name);
      return () => client[operation](...args);
    });

    return withFallbackChain(fallbacks, {
      context: { operation, clients: clientNames }
    });
  };
}

/**
 * Example: Create a multi-provider query function
 * Tries Cerebras, then falls back to Groq, then GLM
 */
const multiProviderQuery = createFallbackChain('query', [
  'CerebrasClient',
  'GroqClient',
  'UnifiedAIClient',
  'GeminaClient'
]);

/**
 * Example: Create a multi-source news function
 * Tries primary news source, then falls back to web search
 */
const multiSourceNews = createFallbackChain('search', [
  'NewsClient',
  'TavilyClient'
]);

module.exports = {
  // Client access
  getClient,
  getAllClients,
  getOriginalClients,

  // Health & monitoring
  testClientHealth,
  getHealthReport,
  getHealthStatus,
  getResilienceStats,

  // Fallback chains
  createFallbackChain,

  // Pre-configured fallback chains
  multiProviderQuery,
  multiSourceNews,

  // Export both collections for advanced usage
  originalClients,
  protectedClients
};

// Export for ES modules
module.exports.default = module.exports;
