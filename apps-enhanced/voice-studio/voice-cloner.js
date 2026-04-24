/**
 * Voice Library Service
 * Select and configure voices from ElevenLabs character voice library
 *
 * @module apps/voice-studio/voice-cloner
 * @version 2.0.0
 */

const axios = require('axios');

class VoiceLibrary {
  constructor(options = {}) {
    this.apiKey = options.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Character voice library from ElevenLabs
    this.characterVoices = {
      // Story Characters
      narrator: {
        name: 'Narrator',
        voiceId: 'ODq5zmih8GrVes37Dizj', // ElevenLabs default narrator
        category: 'story',
        settings: { stability: 0.8, similarity_boost: 0.9 },
        characteristics: { pitch: 'medium', tempo: 'steady', energy: 'calm' },
      },
      hero: {
        name: 'Hero',
        voiceId: 'AZnzlk1XvdvUeBnXmlld',
        category: 'story',
        settings: { stability: 0.6, similarity_boost: 0.8 },
        characteristics: { pitch: 'medium-high', tempo: 'medium', energy: 'confident' },
      },
      villain: {
        name: 'Villain',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        category: 'story',
        settings: { stability: 0.7, similarity_boost: 0.85 },
        characteristics: { pitch: 'low', tempo: 'slow', energy: 'menacing' },
      },
      sidekick: {
        name: 'Sidekick',
        voiceId: 'ErXwobaYiN0w9Q0z0Gqb',
        category: 'story',
        settings: { stability: 0.5, similarity_boost: 0.7 },
        characteristics: { pitch: 'high', tempo: 'fast', energy: 'enthusiastic' },
      },
      wise_old_man: {
        name: 'Wise Old Man',
        voiceId: 'L8f8sKpM3mKkH5ZQ2w5T',
        category: 'story',
        settings: { stability: 0.9, similarity_boost: 0.9 },
        characteristics: { pitch: 'low', tempo: 'slow', energy: 'calm' },
      },

      // Age Groups
      child: {
        name: 'Child',
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        category: 'age',
        settings: { stability: 0.5, similarity_boost: 0.75 },
        characteristics: { pitch: 'high', tempo: 'fast', energy: 'enthusiastic' },
      },
      teenager: {
        name: 'Teenager',
        voiceId: 'Vj8PmN6LqhdkwPQHkZ2L',
        category: 'age',
        settings: { stability: 0.6, similarity_boost: 0.7 },
        characteristics: { pitch: 'medium', tempo: 'fast', energy: 'casual' },
      },
      adult: {
        name: 'Adult',
        voiceId: 'ODq5zmih8GrVes37Dizj',
        category: 'age',
        settings: { stability: 0.7, similarity_boost: 0.8 },
        characteristics: { pitch: 'medium', tempo: 'medium', energy: 'neutral' },
      },
      elderly: {
        name: 'Elderly',
        voiceId: 'TXKGxPwFvIFhWNXcJaGVh',
        category: 'age',
        settings: { stability: 0.9, similarity_boost: 0.9 },
        characteristics: { pitch: 'low', tempo: 'slow', energy: 'calm' },
      },

      // Accents
      american: {
        name: 'American',
        voiceId: 'ODq5zmih8GrVes37Dizj',
        category: 'accent',
        settings: { stability: 0.7, similarity_boost: 0.8 },
        characteristics: { pitch: 'medium', tempo: 'medium', energy: 'neutral' },
      },
      british: {
        name: 'British',
        voiceId: 'Z7fHQKq8PkL0EzDIY4v2',
        category: 'accent',
        settings: { stability: 0.8, similarity_boost: 0.9 },
        characteristics: { pitch: 'medium-low', tempo: 'medium', energy: 'sophisticated' },
      },
      indian_english: {
        name: 'Indian English',
        voiceId: '5QHtKl3ZQ8QoG6YFvYwQ',
        category: 'accent',
        settings: { stability: 0.7, similarity_boost: 0.8 },
        characteristics: { pitch: 'medium', tempo: 'medium', energy: 'warm' },
      },
      australian: {
        name: 'Australian',
        voiceId: 'F2j2YqEs2AaCdVHJ5V3z',
        category: 'accent',
        settings: { stability: 0.7, similarity_boost: 0.8 },
        characteristics: { pitch: 'medium', tempo: 'medium', energy: 'casual' },
      },

      // Professional
      newscaster: {
        name: 'Newscaster',
        voiceId: 'Tt7KgQjxYJpO7KLJYc5',
        category: 'professional',
        settings: { stability: 0.8, similarity_boost: 0.85 },
        characteristics: { pitch: 'medium', tempo: 'fast', energy: 'authoritative' },
      },
      narrator_professional: {
        name: 'Professional Narrator',
        voiceId: 'Z7fHQKq8PkL0EzDIY4v2',
        category: 'professional',
        settings: { stability: 0.8, similarity_boost: 0.9 },
        characteristics: { pitch: 'medium-low', tempo: 'medium', energy: 'sophisticated' },
      },

      // Styles
      robot: {
        name: 'Robot',
        voiceId: 'L8f8sKpM3mKkH5ZQ2w5T',
        category: 'style',
        settings: { stability: 0.95, similarity_boost: 0.5 },
        characteristics: { pitch: 'low', tempo: 'steady', energy: 'mechanical' },
      },
      whisper: {
        name: 'Whisper',
        voiceId: 'ODq5zmih8GrVes37Dizj',
        category: 'style',
        settings: { stability: 0.9, similarity_boost: 0.85 },
        characteristics: { pitch: 'low', tempo: 'slow', energy: 'soft' },
      },
    };
  }

  /**
   * Get voice by character name or category
   * @param {string} character - Character name or category
   * @returns {object>} - Voice configuration
   */
  getVoice(character) {
    const voice = this.characterVoices[character.toLowerCase()] || this.characterVoices.narrator;
    return {
      ...voice,
      character: character.toLowerCase(),
    };
  }

  /**
   * Get all voices by category
   * @param {string} category - Category filter (story, age, accent, professional, style)
   * @returns {Array>} - List of voices in category
   */
  getVoicesByCategory(category) {
    return Object.values(this.characterVoices).filter(voice => voice.category === category);
  }

  /**
   * Search voices by characteristics
   * @param {object} criteria - Search criteria
   * @returns {Array>} - Matching voices
   */
  searchVoices(criteria = {}) {
    const { pitch, tempo, energy, category } = criteria;

    return Object.values(this.characterVoices).filter(voice => {
      if (category && voice.category !== category) return false;
      if (pitch && voice.characteristics.pitch !== pitch) return false;
      if (tempo && voice.characteristics.tempo !== tempo) return false;
      if (energy && voice.characteristics.energy !== energy) return false;
      return true;
    });
  }

  /**
   * Get recommended voices for story character
   * @param {string} characterType - Character type (hero, villain, narrator, etc.)
   * @returns {object>} - Recommended voice configuration
   */
  getRecommendedVoice(characterType) {
    const recommendations = {
      hero: [this.characterVoices.hero, this.characterVoices.adult],
      villain: [this.characterVoices.villain, this.characterVoices.elderly],
      narrator: [this.characterVoices.narrator, this.characterVoices.narrator_professional],
      sidekick: [this.characterVoices.sidekick, this.characterVoices.teenager],
      wise_old_man: [this.characterVoices.wise_old_man, this.characterVoices.elderly],
      child: [this.characterVoices.child, this.characterVoices.teenager],
      robot: [this.characterVoices.robot, this.characterVoices.narrator],
    };

    const options = recommendations[characterType.toLowerCase()] || [this.characterVoices.narrator];
    return options[0];
  }

  /**
   * Configure voice settings
   * @param {string} character - Character name
   * @param {object} settings - Custom settings override
   * @returns {object>} - Configured voice
   */
  configureVoice(character, settings = {}) {
    const voice = this.getVoice(character);

    return {
      ...voice,
      settings: {
        ...voice.settings,
        ...settings,
      },
    };
  }

  /**
   * Design custom voice with parameters
   * @param {string} name - Voice name
   * @param {object} parameters - Voice parameters
   * @returns {Promise<object>} - Created voice details
   */
  async designVoice(name, parameters = {}) {
    try {
      const {
        gender = 'female',
        age = 'young',
        accent = 'american',
        style = 'narration',
        pitch = 0,
        speed = 1.0,
      } = parameters;

      // Create voice design request
      const response = await this.axiosInstance.post('/voices/add', {
        name,
        description: `Custom voice: ${gender}, ${age}, ${accent} accent, ${style} style`,
        labels: {
          gender,
          age,
          accent,
          style,
        },
        settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style,
          use_speaker_boost: true,
        },
      });

      return {
        voiceId: response.data.voice_id,
        name: response.data.name,
        parameters: { gender, age, accent, style },
        settings: {
          pitch,
          speed,
          stability: 0.5,
          similarity_boost: 0.75,
        },
        status: 'designed',
        message: 'Custom voice designed successfully',
      };
    } catch (error) {
      throw new Error(`Voice design failed: ${error.message}`);
    }
  }

  /**
   * Get all custom voices
   * @returns {Promise<Array>} - List of custom voices
   */
  async getCustomVoices() {
    try {
      const response = await this.axiosInstance.get('/voices');

      const voices = response.data.voices.map(voice => ({
        voiceId: voice.voice_id,
        name: voice.name,
        labels: voice.labels || {},
        previewUrl: voice.preview_url,
        category: this._getVoiceCategory(voice),
      }));

      return {
        count: voices.length,
        voices,
      };
    } catch (error) {
      throw new Error(`Failed to fetch custom voices: ${error.message}`);
    }
  }

  /**
   * Get voice details
   * @param {string} voiceId - Voice ID
   * @returns {Promise<object>} - Voice details
   */
  async getVoiceDetails(voiceId) {
    try {
      const response = await this.axiosInstance.get(`/voices/${voiceId}`);

      return {
        voiceId: response.data.voice_id,
        name: response.data.name,
        labels: response.data.labels,
        samples: response.data.samples || [],
        settings: response.data.settings || {},
        category: this._getVoiceCategory(response.data),
      };
    } catch (error) {
      throw new Error(`Failed to get voice details: ${error.message}`);
    }
  }

  /**
   * Test custom voice with sample text
   * @param {string} voiceId - Voice ID
   * @param {string} text - Test text
   * @param {object} options - TTS options
   * @returns {Promise<Buffer>} - Audio buffer
   */
  async testVoice(voiceId, text, options = {}) {
    try {
      const {
        modelId = 'eleven_multilingual_v2',
        stability = 0.5,
        similarityBoost = 0.75,
        style = 'narration',
        speakerBoost = true,
      } = options;

      const response = await this.axiosInstance.post(
        `/text-to-speech/${voiceId}`,
        {
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
          },
        },
        {
          responseType: 'arraybuffer',
        }
      );

      return {
        audio: Buffer.from(response.data),
        voiceId,
        text,
        settings: { stability, similarityBoost, style },
        duration: this._estimateDuration(Buffer.from(response.data)),
      };
    } catch (error) {
      throw new Error(`Voice test failed: ${error.message}`);
    }
  }

  /**
   * Update voice settings
   * @param {string} voiceId - Voice ID
   * @param {object} settings - New settings
   * @returns {Promise<object>} - Updated voice
   */
  async updateVoiceSettings(voiceId, settings = {}) {
    try {
      const response = await this.axiosInstance.patch(`/voices/${voiceId}/settings`, settings);

      return {
        voiceId,
        settings: response.data,
        status: 'updated',
        message: 'Voice settings updated successfully',
      };
    } catch (error) {
      throw new Error(`Failed to update voice settings: ${error.message}`);
    }
  }

  /**
   * Delete custom voice
   * @param {string} voiceId - Voice ID
   * @returns {Promise<object>} - Deletion result
   */
  async deleteVoice(voiceId) {
    try {
      await this.axiosInstance.delete(`/voices/${voiceId}`);

      return {
        voiceId,
        status: 'deleted',
        message: 'Voice deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete voice: ${error.message}`);
    }
  }

  /**
   * Estimate audio duration from buffer
   * @private
   */
  _estimateDuration(buffer) {
    // Rough estimation: MP3 at 128 kbps
    const bitrate = 128000; // bits per second
    const bytesPerSecond = bitrate / 8;
    return buffer.length / bytesPerSecond;
  }

  /**
   * Get voice category from labels
   * @private
   */
  _getVoiceCategory(voice) {
    const labels = voice.labels || {};

    if (labels.gender === 'male' && labels.age === 'elderly') return 'elderly_male';
    if (labels.gender === 'female' && labels.age === 'elderly') return 'elderly_female';
    if (labels.gender === 'male' && labels.age === 'young') return 'young_male';
    if (labels.gender === 'female' && labels.age === 'young') return 'young_female';
    if (labels.accent === 'american') return 'american';
    if (labels.accent === 'british') return 'british';
    if (labels.accent === 'indian') return 'indian';

    return 'custom';
  }
}

module.exports = VoiceCloner;
