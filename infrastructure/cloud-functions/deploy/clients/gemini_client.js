/**
 * Gemini Client Stub
 * Placeholder for Google Gemini API integration
 */
class GeminiClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  }

  async healthCheck() {
    return { status: 'unavailable', reason: 'Gemini client not configured' };
  }

  async query(q) {
    throw new Error('Gemini client not available');
  }
}

module.exports = GeminiClient;
