/**
 * TMLPD Client Stub
 * Placeholder for TMLPD API integration
 */
class TMLPDClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.TMLPD_API_KEY;
  }

  async healthCheck() {
    return { status: 'unavailable', reason: 'TMLPD client not configured' };
  }

  async query(q) {
    throw new Error('TMLPD client not available');
  }
}

module.exports = TMLPDClient;
