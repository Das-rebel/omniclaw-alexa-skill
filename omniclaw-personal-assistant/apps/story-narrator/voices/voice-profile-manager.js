/**
 * Voice Profile Manager - Multi-Character Voice Synthesis
 * Manages voice profiles, emotion modulation, and TTS provider selection
 */

const { withTimeout } = require('../../../shared/resilience/timeout-wrapper');
const { retryWithBackoff } = require('../../../shared/resilience/retry');

/**
 * Emotion to TTS parameter mapping
 */
const EMOTION_PROFILES = {
  neutral: {
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    stability: 0.8
  },
  excited: {
    speed: 1.15,
    pitch: 1.1,
    volume: 1.1,
    stability: 0.6
  },
  sad: {
    speed: 0.85,
    pitch: 0.9,
    volume: 0.85,
    stability: 0.85
  },
  angry: {
    speed: 1.1,
    pitch: 1.2,
    volume: 1.15,
    stability: 0.5
  },
  whisper: {
    speed: 0.9,
    pitch: 0.95,
    volume: 0.5,
    stability: 0.9
  },
  happy: {
    speed: 1.05,
    pitch: 1.05,
    volume: 1.05,
    stability: 0.7
  },
  tense: {
    speed: 0.95,
    pitch: 1.0,
    volume: 0.95,
    stability: 0.6
  }
};

/**
 * Character voice configurations for ElevenLabs
 */
const CHARACTER_VOICES = {
  NARRATOR: {
    elevenLabsVoiceId: 'eleven_multilingual_v2',
    fallbackVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    baseSettings: {
      stability: 0.8,
      similarity_boost: 0.75,
      style: 0.3,
      use_speaker_boost: true
    }
  },
  HERO: {
    elevenLabsVoiceId: 'eleven_multilingual_v2',
    fallbackVoiceId: 'AZnzlk1XvdvUeBnXmlld', // Domi
    baseSettings: {
      stability: 0.7,
      similarity_boost: 0.85,
      style: 0.5,
      use_speaker_boost: true
    }
  },
  VILLAIN: {
    elevenLabsVoiceId: 'eleven_multilingual_v2',
    fallbackVoiceId: 'ErXwobaYiN0NdQvzs5C3', // Antoni
    baseSettings: {
      stability: 0.9,
      similarity_boost: 0.6,
      style: 0.2,
      use_speaker_boost: false
    }
  },
  SIDEKICK: {
    elevenLabsVoiceId: 'eleven_multilingual_v2',
    fallbackVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    baseSettings: {
      stability: 0.6,
      similarity_boost: 0.9,
      style: 0.7,
      use_speaker_boost: true
    }
  },
  WISE_OLD_MAN: {
    elevenLabsVoiceId: 'eleven_multilingual_v2',
    fallbackVoiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh
    baseSettings: {
      stability: 0.85,
      similarity_boost: 0.7,
      style: 0.1,
      use_speaker_boost: true
    }
  }
};

/**
 * Voice Profile Manager Class
 */
class VoiceProfileManager {
  constructor(options = {}) {
    this.options = {
      primaryProvider: options.primaryProvider || 'elevenlabs',
      fallbackProvider: options.fallbackProvider || 'azure',
      defaultLanguage: options.defaultLanguage || 'en',
      targetLatency: options.targetLatency || 400, // ms
      ...options
    };

    // Provider clients
    this.elevenLabsClient = null;
    this.azureClient = null;
    this.sarvamClient = null;

    // Performance tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      latencyHistory: []
    };
  }

  /**
   * Initialize TTS providers
   */
  initialize(providers) {
    if (providers.elevenLabs) {
      this.elevenLabsClient = providers.elevenLabs;
    }
    if (providers.azure) {
      this.azureClient = providers.azure;
    }
    if (providers.sarvam) {
      this.sarvamClient = providers.sarvam;
    }

    console.log('[VoiceProfileManager] Initialized with providers:',
      Object.keys(providers).join(', '));
  }

  /**
   * Synthesize speech for a story segment
   * @param {Object} segment - Story segment with character, emotion, text
   * @returns {Promise<Buffer>} - Audio buffer
   */
  async synthesizeSegment(segment) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const audioBuffer = await this._synthesizeWithRetry(segment);
      const latency = Date.now() - startTime;

      this._recordSuccess(latency);
      console.log(`[VoiceProfileManager] Synthesized "${segment.character}" segment in ${latency}ms`);

      return audioBuffer;

    } catch (error) {
      this._recordFailure();
      console.error(`[VoiceProfileManager] Synthesis failed for ${segment.character}:`, error);
      throw error;
    }
  }

  /**
   * Synthesize with retry logic
   * @private
   */
  async _synthesizeWithRetry(segment) {
    // Try primary provider first
    try {
      return await withTimeout(
        this._synthesize(segment, this.options.primaryProvider),
        this.options.targetLatency + 2000, // Allow some buffer
        `TTS synthesis (${this.options.primaryProvider})`
      );
    } catch (error) {
      console.warn(`[VoiceProfileManager] Primary provider failed, trying fallback`);

      // Try fallback provider
      if (this.options.fallbackProvider) {
        return await withTimeout(
          this._synthesize(segment, this.options.fallbackProvider),
          this.options.targetLatency + 2000,
          `TTS synthesis (${this.options.fallbackProvider})`
        );
      }

      throw error;
    }
  }

  /**
   * Synthesize using specific provider
   * @private
   */
  async _synthesize(segment, provider) {
    const voiceSettings = this._getVoiceSettings(segment);

    switch (provider) {
      case 'elevenlabs':
        return await this._synthesizeElevenLabs(segment, voiceSettings);

      case 'azure':
        return await this._synthesizeAzure(segment, voiceSettings);

      case 'sarvam':
        return await this._synthesizeSarvam(segment, voiceSettings);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get voice settings for a segment
   * @private
   */
  _getVoiceSettings(segment) {
    const characterVoice = CHARACTER_VOICES[segment.character] || CHARACTER_VOICES.NARRATOR;
    const emotionProfile = EMOTION_PROFILES[segment.emotion] || EMOTION_PROFILES.neutral;

    return {
      voiceId: characterVoice.elevenLabsVoiceId,
      fallbackVoiceId: characterVoice.fallbackVoiceId,
      baseSettings: characterVoice.baseSettings,
      emotion: emotionProfile
    };
  }

  /**
   * Synthesize using ElevenLabs Turbo v2.5
   * @private
   */
  async _synthesizeElevenLabs(segment, settings) {
    if (!this.elevenLabsClient) {
      throw new Error('ElevenLabs client not initialized');
    }

    // Apply emotion modulation
    const voiceSettings = this._applyEmotion(settings.baseSettings, settings.emotion);

    const response = await this.elevenLabsClient.textToSpeech.convert({
      voice_id: settings.fallbackVoiceId,
      output_format: 'mp3_44100_128',
      text: segment.text,
      model_id: 'eleven_turbo_v2_5', // Fastest model
      voice_settings: voiceSettings
    });

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Synthesize using Azure Neural TTS
   * @private
   */
  async _synthesizeAzure(segment, settings) {
    if (!this.azureClient) {
      throw new Error('Azure client not initialized');
    }

    // Build SSML with emotion
    const ssml = this._buildSSML(segment, settings);

    const response = await this.azureClient.synthesize(ssml, {
      language: this.options.defaultLanguage,
      voice: settings.fallbackVoiceId
    });

    return response.audioData;
  }

  /**
   * Synthesize using Sarvam AI (for Indian languages)
   * @private
   */
  async _synthesizeSarvam(segment, settings) {
    if (!this.sarvamClient) {
      throw new Error('Sarvam client not initialized');
    }

    const response = await this.sarvamClient.tts.generate({
      text: segment.text,
      language: this.options.defaultLanguage,
      speaker_id: settings.fallbackVoiceId
    });

    return Buffer.from(response.audio);
  }

  /**
   * Apply emotion modulation to voice settings
   * @private
   */
  _applyEmotion(baseSettings, emotion) {
    return {
      stability: Math.max(0, Math.min(1, baseSettings.stability * emotion.stability)),
      similarity_boost: baseSettings.similarity_boost,
      style: Math.max(0, Math.min(1, baseSettings.style + (emotion.speed - 1.0) * 0.3)),
      use_speaker_boost: baseSettings.use_speaker_boost
    };
  }

  /**
   * Build SSML for Azure Neural TTS
   * @private
   */
  _buildSSML(segment, settings) {
    const emotion = settings.emotion;

    return `
      <speak version='1.0' xml:lang='${this.options.defaultLanguage}'>
        <voice name='${settings.fallbackVoiceId}'>
          <prosody
            rate='${emotion.speed > 1 ? 'fast' : emotion.speed < 1 ? 'slow' : 'medium'}'
            pitch='${emotion.pitch > 1 ? '+20%' : emotion.pitch < 1 ? '-20%' : '+0%'}'
            volume='${emotion.volume > 1 ? 'loud' : emotion.volume < 1 ? 'soft' : 'medium'}'>
            ${segment.text}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  /**
   * Batch synthesize multiple segments
   * @param {Array} segments - Array of story segments
   * @returns {Promise<Array>} - Array of audio buffers
   */
  async synthesizeBatch(segments) {
    console.log(`[VoiceProfileManager] Batch synthesizing ${segments.length} segments`);

    // Process in parallel with concurrency limit
    const concurrency = 3;
    const results = [];

    for (let i = 0; i < segments.length; i += concurrency) {
      const batch = segments.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(segment => this.synthesizeSegment(segment))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Record successful synthesis
   * @private
   */
  _recordSuccess(latency) {
    this.metrics.successfulRequests++;
    this.metrics.latencyHistory.push(latency);

    // Keep only last 100 measurements
    if (this.metrics.latencyHistory.length > 100) {
      this.metrics.latencyHistory.shift();
    }

    // Update average
    this.metrics.averageLatency =
      this.metrics.latencyHistory.reduce((a, b) => a + b, 0) /
      this.metrics.latencyHistory.length;
  }

  /**
   * Record failed synthesis
   * @private
   */
  _recordFailure() {
    this.metrics.failedRequests++;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0,
      p50Latency: this._getPercentile(50),
      p95Latency: this._getPercentile(95),
      p99Latency: this._getPercentile(99)
    };
  }

  /**
   * Get percentile latency
   * @private
   */
  _getPercentile(percentile) {
    if (this.metrics.latencyHistory.length === 0) return 0;

    const sorted = [...this.metrics.latencyHistory].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Check if target latency is being met
   */
  isTargetMet() {
    return this.metrics.averageLatency <= this.options.targetLatency;
  }

  /**
   * Get optimal voice configuration for character
   */
  getCharacterVoice(character) {
    return CHARACTER_VOICES[character] || CHARACTER_VOICES.NARRATOR;
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      latencyHistory: []
    };
  }
}

module.exports = {
  VoiceProfileManager,
  CHARACTER_VOICES,
  EMOTION_PROFILES
};
