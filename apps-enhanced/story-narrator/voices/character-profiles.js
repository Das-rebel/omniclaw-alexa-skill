/**
 * Character Voice Profiles
 * Defines voice characteristics for different character archetypes
 */

module.exports = {
  NARRATOR: {
    name: 'Narrator',
    description: 'Professional storytelling voice',
    voiceConfig: {
      // ElevenLabs settings
      voiceId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.3,
      use_speaker_boost: true,

      // Azure fallback (SSML)
      azureVoice: 'en-US-GuyNeural',

      // Base settings
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0
    },
    emotionModifiers: {
      neutral: { speed: 1.0, pitch: 1.0, volume: 1.0 },
      excited: { speed: 1.1, pitch: 1.05, volume: 1.1 },
      sad: { speed: 0.9, pitch: 0.95, volume: 0.9 },
      mysterious: { speed: 0.95, pitch: 0.98, volume: 0.95 }
    }
  },

  HERO: {
    name: 'Hero',
    description: 'Strong, confident protagonist',
    voiceConfig: {
      voiceId: 'eleven_turbo_v2',
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true,
      azureVoice: 'en-US-ChristopherNeural',
      speed: 1.0,
      pitch: 1.15,
      volume: 1.1
    },
    emotionModifiers: {
      neutral: { speed: 1.0, pitch: 1.15, volume: 1.1 },
      excited: { speed: 1.15, pitch: 1.2, volume: 1.2 },
      determined: { speed: 1.05, pitch: 1.15, volume: 1.15 },
      worried: { speed: 0.95, pitch: 1.1, volume: 1.0 }
    }
  },

  VILLAIN: {
    name: 'Villain',
    description: 'Deep, menacing antagonist',
    voiceConfig: {
      voiceId: 'eleven_multilingual_v2',
      stability: 0.6,
      similarity_boost: 0.85,
      style: 0.7,
      use_speaker_boost: true,
      azureVoice: 'en-US-BrandonNeural',
      speed: 0.9,
      pitch: 0.75,
      volume: 1.0
    },
    emotionModifiers: {
      neutral: { speed: 0.9, pitch: 0.75, volume: 1.0 },
      angry: { speed: 0.95, pitch: 0.7, volume: 1.15 },
      mocking: { speed: 1.05, pitch: 0.8, volume: 1.05 },
      sinister: { speed: 0.85, pitch: 0.7, volume: 1.1 }
    }
  },

  SIDEKICK: {
    name: 'Sidekick',
    description: 'Cheerful, energetic companion',
    voiceConfig: {
      voiceId: 'eleven_turbo_v2',
      stability: 0.3,
      similarity_boost: 0.7,
      style: 0.6,
      use_speaker_boost: true,
      azureVoice: 'en-US-JennyNeural',
      speed: 1.1,
      pitch: 1.2,
      volume: 1.05
    },
    emotionModifiers: {
      neutral: { speed: 1.1, pitch: 1.2, volume: 1.05 },
      excited: { speed: 1.2, pitch: 1.25, volume: 1.15 },
      worried: { speed: 1.0, pitch: 1.15, volume: 0.95 },
      curious: { speed: 1.15, pitch: 1.2, volume: 1.05 }
    }
  },

  WISE_OLD_MAN: {
    name: 'Wise Old Man',
    description: 'Slow, deliberate mentor figure',
    voiceConfig: {
      voiceId: 'eleven_multilingual_v2',
      stability: 0.7,
      similarity_boost: 0.9,
      style: 0.2,
      use_speaker_boost: true,
      azureVoice: 'en-US-TonyNeural',
      speed: 0.85,
      pitch: 0.8,
      volume: 1.0
    },
    emotionModifiers: {
      neutral: { speed: 0.85, pitch: 0.8, volume: 1.0 },
      contemplative: { speed: 0.8, pitch: 0.78, volume: 0.95 },
      urgent: { speed: 0.95, pitch: 0.85, volume: 1.05 },
      gentle: { speed: 0.82, pitch: 0.8, volume: 0.95 }
    }
  },

  MYSTICAL_CREATURE: {
    name: 'Mystical Creature',
    description: 'Ethereal, otherworldly voice',
    voiceConfig: {
      voiceId: 'eleven_multilingual_v2',
      stability: 0.2,
      similarity_boost: 0.6,
      style: 0.8,
      use_speaker_boost: true,
      azureVoice: 'en-US-AriaNeural',
      speed: 0.95,
      pitch: 1.3,
      volume: 0.9
    },
    emotionModifiers: {
      neutral: { speed: 0.95, pitch: 1.3, volume: 0.9 },
      mysterious: { speed: 0.9, pitch: 1.35, volume: 0.85 },
      powerful: { speed: 1.0, pitch: 1.25, volume: 1.1 }
    }
  },

  /**
   * Get character profile by name
   */
  getProfile(characterName) {
    return this[characterName.toUpperCase()] || this.NARRATOR;
  },

  /**
   * Get emotion modifier for character
   */
  getEmotionModifier(characterName, emotion) {
    const profile = this.getProfile(characterName);
    return profile.emotionModifiers[emotion] || profile.emotionModifiers.neutral;
  },

  /**
   * Apply emotion to voice config
   */
  applyEmotion(characterName, emotion, baseConfig = null) {
    const profile = this.getProfile(characterName);
    const config = baseConfig || profile.voiceConfig;
    const modifier = profile.emotionModifiers[emotion] || profile.emotionModifiers.neutral;

    return {
      ...config,
      speed: config.speed * modifier.speed,
      pitch: config.pitch * modifier.pitch,
      volume: config.volume * modifier.volume
    };
  }
};
