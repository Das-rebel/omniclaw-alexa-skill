/**
 * Resilient TTS Client
 * Wraps all text-to-speech service clients with production-grade resilience patterns
 */

const {
  withTimeout,
  retryWithBackoff,
  CircuitBreaker,
  createResilientFunction,
  withFallbackChain
} = require('../../openclaw-alexa-bridge/resilience');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESILIENCE_CONFIG = {
  // TTS operation timeouts
  timeout: {
    fast: 3000,           // 3 seconds for short phrases
    standard: 10000,      // 10 seconds for paragraphs
    slow: 20000,          // 20 seconds for long texts
    verySlow: 60000       // 60 seconds for very long texts
  },

  // Retry configuration
  retry: {
    maxRetries: 2,        // Fewer retries for TTS (speed matters)
    baseDelay: 500,       // 0.5 seconds base delay
    maxDelay: 5000        // 5 seconds max delay
  },

  // Circuit breaker configuration
  circuitBreaker: {
    threshold: 5,        // Open after 5 failures
    timeout: 60000,      // Try again after 60 seconds
    halfOpenMaxCalls: 3
  }
};

// ============================================================================
// WRAPPER FUNCTIONS
// ============================================================================

/**
 * Wrap a TTS generation operation with resilience
 */
function wrapTTSOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: config.name || 'TTS',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: config.timeout || RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

/**
 * Create a TTS operation with fallback providers
 */
async function synthesizeWithFallbacks(text, options = {}) {
  const fallbacks = [];

  // Primary: ElevenLabs (fastest)
  if (options.elevenLabsKey) {
    fallbacks.push(async () => {
      // Placeholder for ElevenLabs implementation
      const { synthesizeWithElevenLabs } = require('./tts/elevenlabs-client');
      return synthesizeWithElevenLabs(text, options);
    });
  }

  // Secondary: Azure Neural TTS
  if (options.azureKey) {
    fallbacks.push(async () => {
      // Placeholder for Azure implementation
      const { synthesizeWithAzure } = require('./tts/azure-client');
      return synthesizeWithAzure(text, options);
    });
  }

  // Tertiary: Sarvam AI (Indian languages)
  if (options.sarvamKey && needsIndianLanguage(options.language)) {
    fallbacks.push(async () => {
      // Placeholder for Sarvam implementation
      const { synthesizeWithSarvam } = require('./tts/sarvam-client');
      return synthesizeWithSarvam(text, options);
    });
  }

  // Use fallback chain
  try {
    return await withFallbackChain(fallbacks, {
      timeout: options.timeout || RESILIENCE_CONFIG.timeout.slow
    });
  } catch (error) {
    throw new Error(`All TTS providers failed: ${error.message}`);
  }
}

function needsIndianLanguage(language) {
  const indianLanguages = ['hi', 'bn', 'ta', 'te', 'ml', 'kn', 'mr', 'gu'];
  return indianLanguages.some(lang => language?.startsWith(lang));
}

// ============================================================================
// RESILIENT TTS CLIENT CLASS
// ============================================================================

class ResilientTTSClient {
  constructor(primaryClient, options = {}) {
    this.primaryClient = primaryClient;
    this.options = options;
    this._name = 'TTS';
  }

  /**
   * Synthesize speech with resilience and fallbacks
   */
  async synthesize(text, options = {}) {
    // Calculate timeout based on text length
    const textLength = text.length;
    let timeout = RESILIENCE_CONFIG.timeout.standard;

    if (textLength < 100) {
      timeout = RESILIENCE_CONFIG.timeout.fast;
    } else if (textLength > 500) {
      timeout = RESILIENCE_CONFIG.timeout.slow;
    }

    // Use configured fallbacks or defaults
    const fallbacks = options.fallbacks || [];

    return createResilientFunction(
      async () => {
        // Try primary client first
        try {
          return await this.primaryClient.synthesize(text, options);
        } catch (error) {
          console.warn(`Primary TTS failed, trying fallbacks:`, error.message);

          // Try fallbacks if available
          if (fallbacks.length > 0) {
            for (let i = 0; i < fallbacks.length; i++) {
              try {
                const result = await fallbacks[i](text, options);
                console.log(`TTS fallback ${i + 1} succeeded`);
                return result;
              } catch (fallbackError) {
                console.error(`TTS fallback ${i + 1} failed:`, fallbackError.message);
              }
            }
          }

          throw error;
        }
      },
      {
        name: 'TTS_Synthesis',
        timeout: options.timeout || timeout,
        maxRetries: options.maxRetries || RESILIENCE_CONFIG.retry.maxRetries
      }
    )();
  }

  /**
   * Stream synthesis for real-time playback
   */
  async *synthesizeStreaming(text, options = {}) {
    // Break text into chunks for streaming
    const chunks = this.splitIntoChunks(text, options.chunkSize || 28);

    for (const chunk of chunks) {
      try {
        yield await this.synthesize(chunk, {
          ...options,
          timeout: RESILIENCE_CONFIG.timeout.fast
        });
      } catch (error) {
        console.error(`Streaming chunk failed:`, error.message);
        // Continue with next chunk or throw if it's critical
        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Split text into chunks for streaming
   */
  splitIntoChunks(text, chunkSize = 28) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize * 6) { // Rough estimate
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  // Forward other methods
  [key](...args) {
    if (typeof this.primaryClient[key] === 'function') {
      return wrapTTSOperation(
        () => this.primaryClient[key](...args),
        { name: `TTS_${key}`, timeout: RESILIENCE_CONFIG.timeout.standard }
      )();
    }
    return this.primaryClient[key];
  }
}

// ============================================================================
// HEALTH CHECKING
// ============================================================================

const circuitBreakers = {
  ElevenLabs: null,
  Azure: null,
  Sarvam: null
};

function getHealthStatus() {
  return {
    tts: {
      elevenlabs: circuitBreakers.ElevenLabs?.getState() || 'not_configured',
      azure: circuitBreakers.Azure?.getState() || 'not_configured',
      sarvam: circuitBreakers.Sarvam?.getState() || 'not_configured'
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Wrappers
  wrapTTSOperation,
  synthesizeWithFallbacks,

  // Resilient TTS Client
  ResilientTTSClient,

  // Factory function
  createResilientTTSClient(primaryClient, options) {
    return new ResilientTTSClient(primaryClient, options);
  },

  // Configuration
  RESILIENCE_CONFIG,

  // Health Monitoring
  getHealthStatus,
  circuitBreakers
};
