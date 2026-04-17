/**
 * Groq Client Stub
 * Placeholder for Groq API integration
 */
class GroqClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY;
    this.baseUrl = 'https://api.groq.com';
  }

  async healthCheck() {
    return { status: 'unavailable', reason: 'Groq client not configured' };
  }

  async query(q) {
    throw new Error('Groq client not available');
  }
}

module.exports = GroqClient;
