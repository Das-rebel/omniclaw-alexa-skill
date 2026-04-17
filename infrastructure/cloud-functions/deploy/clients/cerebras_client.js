/**
 * Cerebras Client Stub
 * Placeholder for Cerebras API integration
 */
class CerebrasClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.CEREBRAS_API_KEY;
  }

  async healthCheck() {
    return { status: 'unavailable', reason: 'Cerebras client not configured' };
  }

  async query(q) {
    throw new Error('Cerebras client not available');
  }
}

module.exports = CerebrasClient;
