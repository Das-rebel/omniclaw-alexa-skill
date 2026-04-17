/**
 * TMLPD Query Client Stub
 * Placeholder for TMLPD Query API integration
 */
class TMLPDQueryClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.TMLPD_QUERY_API_KEY;
  }

  async healthCheck() {
    return { status: 'unavailable', reason: 'TMLPD Query client not configured' };
  }

  async query(q) {
    throw new Error('TMLPD Query client not available');
  }
}

module.exports = TMLPDQueryClient;
