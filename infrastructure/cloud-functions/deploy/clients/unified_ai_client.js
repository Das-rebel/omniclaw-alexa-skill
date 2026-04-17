/**
 * Unified AI Client Stub
 * Placeholder for Unified AI API integration
 */
class UnifiedAIClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.UNIFIED_AI_API_KEY;
  }

  async healthCheck() {
    return { status: 'unavailable', reason: 'Unified AI client not configured' };
  }

  async query(q) {
    throw new Error('Unified AI client not available');
  }
}

module.exports = UnifiedAIClient;
