/**
 * Story Orchestrator - Narrative Generation Layer
 * Uses Claude 4 Sonnet for character-consistent, archetype-aware storytelling
 */

const { withTimeout } = require('../../../shared/resilience/timeout-wrapper');
const { retryWithBackoff } = require('../../../shared/resilience/retry');

/**
 * Character archetypes with personality traits
 */
const CHARACTER_ARCHETYPES = {
  NARRATOR: {
    role: 'narrator',
    personality: 'professional, steady, objective',
    speechPattern: 'clear, measured pacing',
    emotionalRange: 'subtle'
  },
  HERO: {
    role: 'protagonist',
    personality: 'brave, determined, hopeful',
    speechPattern: 'confident, energetic, higher pitch',
    emotionalRange: 'expressive'
  },
  VILLAIN: {
    role: 'antagonist',
    personality: 'menacing, cunning, dark',
    speechPattern: 'slow, deliberate, deeper voice',
    emotionalRange: 'controlled intensity'
  },
  SIDEKICK: {
    role: 'companion',
    personality: 'cheerful, loyal, energetic',
    speechPattern: 'fast, enthusiastic, higher pitch',
    emotionalRange: 'wide expressiveness'
  },
  WISE_OLD_MAN: {
    role: 'mentor',
    personality: 'calm, knowledgeable, patient',
    speechPattern: 'slow, thoughtful, lower pitch',
    emotionalRange: 'serene'
  }
};

/**
 * Story structure based on Hero's Journey
 */
const STORY_STRUCTURE = {
  stages: [
    'ordinary_world',
    'call_to_adventure',
    'refusal_of_call',
    'meeting_mentor',
    'crossing_threshold',
    'tests_allies_enemies',
    'approach_to_inmost_cave',
    'ordeal',
    'reward',
    'road_back',
    'resurrection',
    'return_with_elixir'
  ]
};

/**
 * Story Orchestrator Class
 */
class StoryOrchestrator {
  constructor(claudeClient, options = {}) {
    this.claudeClient = claudeClient;
    this.options = {
      maxSegments: options.maxSegments || 50,
      segmentLength: options.segmentLength || 150, // words
      language: options.language || 'en',
      genre: options.genre || 'adventure',
      ...options
    };

    // Story state
    this.currentStory = null;
    this.characters = new Map();
    this.storyMemory = new Map();
    this.branchingPoints = [];
  }

  /**
 * Generate a custom persona on demand
 * @param {Object} personaConfig - Persona configuration
 * @returns {Promise<Object>} - Generated persona profile
 */
async generatePersona(personaConfig) {
  const {
    name,
    description,
    personalityTraits = [],
    voiceStyle,
    age,
    gender,
    background
  } = personaConfig;

  console.log(`[StoryOrchestrator] Generating persona: ${name}`);

  try {
    const prompt = `Create a detailed character persona for an audio story.

Name: ${name}
${description ? `Description: ${description}` : ''}
${background ? `Background: ${background}` : ''}
${age ? `Age: ${age}` : ''}
${gender ? `Gender: ${gender}` : ''}
Voice Style Requested: ${voiceStyle || 'natural and expressive'}
${personalityTraits.length ? `Traits to include: ${personalityTraits.join(', ')}` : ''}

Generate a COMPLETE persona profile with:
1. personality: comma-separated personality traits
2. speechPattern: how they speak (pace, pitch, cadence)
3. emotionalRange: emotional expressiveness level
4. voiceProfile: ElevenLabs voice settings (stability, similarity_boost, style, use_speaker_boost)
5. quirks: 2-3 unique speech habits or expressions
6. motivation: what drives this character
7. flaws: 1-2 character weaknesses for conflict

Respond in JSON format only.`;

    const personaJson = await this._generateWithRetry(prompt);
    const persona = JSON.parse(personaJson);

    const customPersona = {
      name,
      role: 'custom',
      ...persona,
      voiceProfile: persona.voiceProfile || {
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0.5,
        use_speaker_boost: true
      },
      isGenerated: true
    };

    const key = name.toUpperCase().replace(/\s+/g, '_');
    this.characters.set(key, customPersona);
    console.log(`[StoryOrchestrator] Persona "${name}" created successfully`);

    return customPersona;
  } catch (error) {
    console.error('[StoryOrchestrator] Persona generation failed:', error);
    throw new Error(`Failed to generate persona: ${error.message}`);
  }
}

/**
 * Generate a story with character consistency
 * @param {Object} storyConfig - Story configuration
 * @returns {Promise<Object>} - Generated story segments
 */
async generateStory(storyConfig) {
  const {
    theme,
    characters = ['NARRATOR', 'HERO'],
    setting,
    plotOutline,
    interactive = false,
    customPersonas = [] // Array of custom persona configs to generate on-demand
  } = storyConfig;

  console.log(`[StoryOrchestrator] Generating story: ${theme}`);

  try {
    // Generate any custom personas first
    for (const personaConfig of customPersonas) {
      await this.generatePersona(personaConfig);
    }

    // Initialize character profiles (including any generated personas)
    this._initializeCharacters(characters);

    // Build story prompt
    const prompt = this._buildStoryPrompt({
      theme,
      characters: this._getCharacterDescriptions(),
      setting,
      plotOutline,
      interactive,
      language: this.options.language
    });

    // Generate story using Claude with resilience
    const storyContent = await this._generateWithRetry(prompt);

    // Parse into segments
    const segments = this._parseStorySegments(storyContent);

    // Store story state
    this.currentStory = {
      id: this._generateStoryId(),
      theme,
      segments,
      characters: Array.from(this.characters.values()),
      createdAt: new Date().toISOString(),
      interactive
    };

    console.log(`[StoryOrchestrator] Generated ${segments.length} segments`);
    return this.currentStory;

  } catch (error) {
    console.error('[StoryOrchestrator] Story generation failed:', error);
    throw new Error(`Failed to generate story: ${error.message}`);
  }
}

  /**
   * Generate next segment for interactive story
   * @param {string} userChoice - User's choice direction
   * @returns {Promise<Object>} - Next story segment
   */
  async generateNextSegment(userChoice) {
    if (!this.currentStory || !this.currentStory.interactive) {
      throw new Error('No active interactive story');
    }

    const prompt = this._buildContinuationPrompt({
      storySoFar: this._getStoryContext(),
      userChoice,
      characters: this._getCharacterDescriptions(),
      language: this.options.language
    });

    const segmentContent = await this._generateWithRetry(prompt);
    const segments = this._parseStorySegments(segmentContent);

    // Add to current story
    this.currentStory.segments.push(...segments);

    return segments[0]; // Return first new segment
  }

  /**
   * Build story generation prompt
   * @private
   */
  _buildStoryPrompt(config) {
    const { theme, characters, setting, plotOutline, interactive, language } = config;

    return `You are a master storyteller creating an immersive ${language} audio story.

Theme: ${theme}
Setting: ${setting || 'A fantasy world of adventure'}
Characters: ${characters}
${plotOutline ? `Plot Outline: ${plotOutline}` : ''}

${interactive ? 'This is an INTERACTIVE story. Include decision points marked as [DECISION: option A | option B | option C]' : ''}

CRITICAL FORMAT REQUIREMENTS:
1. Use character tags: [NARRATOR], [HERO], [VILLAIN], [SIDEKICK], [WISE_OLD_MAN]
2. Add emotional markers: [angry], [whisper], [excited], [sad], [happy], [tense]
3. Include scene descriptions: [SCENE: description]
4. Add pacing indicators: [PAUSE: 1s], [PAUSE: 2s]
5. Keep dialogue segments 15-25 words for optimal TTS
6. Use clear speaker transitions

Story Structure:
- Opening: Establish setting and introduce main character
- Rising action: Build tension with clear character dialogue
- Include sensory details for immersive experience
- Each segment should be self-contained for smooth audio playback

Generate the complete story following these guidelines.`;
  }

  /**
   * Build continuation prompt for interactive stories
   * @private
   */
  _buildContinuationPrompt(config) {
    const { storySoFar, userChoice, characters, language } = config;

    return `Continue this ${language} interactive story based on the user's choice.

Story So Far (last 3 segments):
${storySoFar}

User's Choice: "${userChoice}"

Continue the story with:
1. Immediate consequences of the choice
2. Character reactions using their established personalities
3. Next decision point if appropriate
4. Maintain the same format: [CHARACTER] dialogue [emotion]

Keep segments 15-25 words for optimal TTS performance.`;
  }

  /**
   * Generate content with retry and timeout
   * @private
   */
  async _generateWithRetry(prompt) {
    return withTimeout(
      retryWithBackoff(async () => {
        const response = await this.claudeClient.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        return response.content[0].text;
      }, {
        maxRetries: 3,
        baseDelay: 1000
      }),
      30000,
      'Claude story generation'
    );
  }

  /**
   * Parse story into TTS-optimized segments
   * @private
   */
  _parseStorySegments(content) {
    const segments = [];
    const lines = content.split('\n').filter(line => line.trim());

    let currentCharacter = 'NARRATOR';
    let currentEmotion = 'neutral';
    let currentScene = null;
    let buffer = '';

    for (const line of lines) {
      // Extract character tags
      const characterMatch = line.match(/\[(NARRATOR|HERO|VILLAIN|SIDEKICK|WISE_OLD_MAN)\]/);
      if (characterMatch) {
        if (buffer.trim()) {
          segments.push(this._createSegment(buffer, currentCharacter, currentEmotion, currentScene));
          buffer = '';
        }
        currentCharacter = characterMatch[1];
      }

      // Extract emotion tags
      const emotionMatch = line.match(/\[(angry|whisper|excited|sad|happy|tense|neutral)\]/);
      if (emotionMatch) {
        currentEmotion = emotionMatch[1];
      }

      // Extract scene descriptions
      const sceneMatch = line.match(/\[SCENE: ([^\]]+)\]/);
      if (sceneMatch) {
        currentScene = sceneMatch[1];
      }

      // Extract pause indicators
      const pauseMatch = line.match(/\[PAUSE: (\d+(?:\.\d+)?)s\]/);
      if (pauseMatch) {
        if (buffer.trim()) {
          segments.push(this._createSegment(buffer, currentCharacter, currentEmotion, currentScene));
          buffer = '';
        }
        segments.push({
          type: 'pause',
          duration: parseFloat(pauseMatch[1])
        });
      }

      // Extract decision points
      const decisionMatch = line.match(/\[DECISION: ([^\]]+)\]/);
      if (decisionMatch) {
        if (buffer.trim()) {
          segments.push(this._createSegment(buffer, currentCharacter, currentEmotion, currentScene));
          buffer = '';
        }
        const options = decisionMatch[1].split('|').map(opt => opt.trim());
        segments.push({
          type: 'decision',
          options
        });
        continue;
      }

      // Accumulate dialogue
      const cleanLine = line
        .replace(/\[(NARRATOR|HERO|VILLAIN|SIDEKICK|WISE_OLD_MAN)\]/g, '')
        .replace(/\[(angry|whisper|excited|sad|happy|tense|neutral)\]/g, '')
        .replace(/\[SCENE: [^\]]+\]/g, '')
        .replace(/\[PAUSE: \d+(?:\.\d+)?s\]/g, '')
        .trim();

      if (cleanLine) {
        buffer += (buffer ? ' ' : '') + cleanLine;
      }
    }

    // Don't forget the last segment
    if (buffer.trim()) {
      segments.push(this._createSegment(buffer, currentCharacter, currentEmotion, currentScene));
    }

    return segments;
  }

  /**
   * Create a story segment object
   * @private
   */
  _createSegment(text, character, emotion, scene) {
    return {
      type: 'dialogue',
      character,
      emotion,
      scene,
      text,
      wordCount: text.split(/\s+/).length,
      estimatedDuration: this._estimateDuration(text)
    };
  }

  /**
   * Estimate audio duration for a segment
   * @private
   */
  _estimateDuration(text) {
    // Average speaking rate: 150 words per minute
    const words = text.split(/\s+/).length;
    return (words / 150) * 60; // seconds
  }

  /**
   * Initialize character profiles
   * @private
   */
  _initializeCharacters(characterList) {
    for (const charName of characterList) {
      // Skip if already generated (has custom persona)
      if (this.characters.has(charName)) continue;

      if (CHARACTER_ARCHETYPES[charName]) {
        this.characters.set(charName, {
          name: charName,
          ...CHARACTER_ARCHETYPES[charName],
          voiceProfile: this._getVoiceProfile(charName)
        });
      }
    }
  }

  /**
   * Get voice profile for character
   * @private
   */
  _getVoiceProfile(character) {
    const profiles = {
      NARRATOR: {
        stability: 0.8,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true
      },
      HERO: {
        stability: 0.7,
        similarity_boost: 0.85,
        style: 0.5,
        use_speaker_boost: true
      },
      VILLAIN: {
        stability: 0.9,
        similarity_boost: 0.6,
        style: 0.2,
        use_speaker_boost: false
      },
      SIDEKICK: {
        stability: 0.6,
        similarity_boost: 0.9,
        style: 0.7,
        use_speaker_boost: true
      },
      WISE_OLD_MAN: {
        stability: 0.85,
        similarity_boost: 0.7,
        style: 0.1,
        use_speaker_boost: true
      }
    };

    return profiles[character] || profiles.NARRATOR;
  }

  /**
   * Get character descriptions for prompt
   * @private
   */
  _getCharacterDescriptions() {
    return Array.from(this.characters.values())
      .map(char => `${char.name}: ${char.personality}, ${char.speechPattern}`)
      .join('\n');
  }

  /**
   * Get story context for continuation
   * @private
   */
  _getStoryContext() {
    if (!this.currentStory) return '';

    const recentSegments = this.currentStory.segments.slice(-3);
    return recentSegments
      .map(seg => `[${seg.character}] ${seg.text}`)
      .join('\n');
  }

  /**
   * Generate unique story ID
   * @private
   */
  _generateStoryId() {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current story state
   */
  getStoryState() {
    return this.currentStory ? {
      id: this.currentStory.id,
      theme: this.currentStory.theme,
      segmentCount: this.currentStory.segments.length,
      characters: this.currentStory.characters.length,
      interactive: this.currentStory.interactive
    } : null;
  }

  /**
   * Save story to persistent storage
   */
  saveStory() {
    if (!this.currentStory) return;

    this.storyMemory.set(this.currentStory.id, {
      ...this.currentStory,
      savedAt: new Date().toISOString()
    });

    console.log(`[StoryOrchestrator] Saved story: ${this.currentStory.id}`);
  }

  /**
   * Load story from memory
   */
  loadStory(storyId) {
    const story = this.storyMemory.get(storyId);
    if (story) {
      this.currentStory = story;
      this._initializeCharacters(story.characters.map(c => c.name));
      return story;
    }
    return null;
  }

  /**
   * Reset orchestrator state
   */
  reset() {
    this.currentStory = null;
    this.characters.clear();
    this.branchingPoints = [];
  }
}

module.exports = {
  StoryOrchestrator,
  CHARACTER_ARCHETYPES,
  STORY_STRUCTURE
};
