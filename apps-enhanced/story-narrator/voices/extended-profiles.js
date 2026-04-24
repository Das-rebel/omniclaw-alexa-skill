/**
 * Extended Voice Profiles for Story Narrator
 * Additional voice profiles for diverse character voices
 *
 * @module apps/story-narrator/voices/extended-profiles
 * @version 2.0.0 (Enhanced)
 */

const extendedVoiceProfiles = {
  child: {
    name: 'Child',
    description: 'Young child voice (ages 6-12)',
    elevenlabsId: 'TXkLMBBYA1MvDZXb4Z8',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 'narration',
    },
    characteristics: {
      pitch: 'high',
      tempo: 'fast',
      energy: 'enthusiastic',
    },
  },

  elderly: {
    name: 'Elderly',
    description: 'Older adult voice (ages 60+)',
    elevenlabsId: 'TXKGxPwFvIFhWNXcJaGVh',
    settings: {
      stability: 0.9,
      similarity_boost: 0.9,
      style: 'narration',
    },
    characteristics: {
      pitch: 'low',
      tempo: 'slow',
      energy: 'calm',
    },
  },

  indian_english: {
    name: 'Indian English',
    description: 'Indian accent with warm tone',
    elevenlabsId: '5QHtKl3ZQ8QoG6YFvYwQ',
    settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 'narration',
    },
    characteristics: {
      pitch: 'medium',
      tempo: 'medium',
      energy: 'warm',
    },
  },

  newscaster: {
    name: 'Newscaster',
    description: 'Professional American news anchor voice',
    elevenlabsId: 'Tt7KgQjxYJpO7KLJYc5',
    settings: {
      stability: 0.8,
      similarity_boost: 0.85,
      style: 'news',
    },
    characteristics: {
      pitch: 'medium',
      tempo: 'fast',
      energy: 'authoritative',
    },
  },

  british_narrator: {
    name: 'British Narrator',
    description: 'Classic BBC documentary narrator voice',
    elevenlabsId: 'Z7fHQKq8PkL0EzDIY4v2',
    settings: {
      stability: 0.8,
      similarity_boost: 0.9,
      style: 'narration',
    },
    characteristics: {
      pitch: 'medium-low',
      tempo: 'medium',
      energy: 'sophisticated',
    },
  },

  teenager: {
    name: 'Teenager',
    description: 'Teen voice (ages 13-17)',
    elevenlabsId: 'Vj8PmN6LqhdkwPQHkZ2L',
    settings: {
      stability: 0.6,
      similarity_boost: 0.7,
      style: 'casual',
    },
    characteristics: {
      pitch: 'medium',
      tempo: 'fast',
      energy: 'enthusiastic',
    },
  },

  robot: {
    name: 'Robot',
    description: 'Synthetic AI/computer voice',
    elevenlabsId: 'L8f8sKpM3mKkH5ZQ2w5T',
    settings: {
      stability: 0.95,
      similarity_boost: 0.5,
      style: 'narration',
    },
    characteristics: {
      pitch: 'low',
      tempo: 'steady',
      energy: 'mechanical',
    },
  },
};

module.exports = {
  extendedVoiceProfiles,
  getAllVoiceProfiles: () => Object.values(extendedVoiceProfiles),
  getVoiceProfile: (name) => extendedVoiceProfiles[name],
};
