/**
 * Story Narrator Engine - Main Entry Point
 * OmniClaw Personal Assistant - Phase 4
 *
 * Complete multi-character voice synthesis system with:
 * - Story generation using Claude 4 Sonnet
 * - Character voice profiles with emotion modulation
 * - Streaming TTS with <400ms latency
 * - Interactive branching narratives
 * - Indian language support
 */

const { StoryManager, createStoryManager } = require('./orchestrator/story-manager');
const { StoryOrchestrator } = require('./orchestrator/story-orchestrator');
const { VoiceProfileManager, CHARACTER_VOICES, EMOTION_PROFILES } = require('./voices/voice-profile-manager');
const { StreamingTTSEngine, AudioStreamPlayer } = require('./tts/streaming-tts-engine');
const { getStory, getAllStories, getRandomStory } = require('./stories/demo-stories');

// Resilience wrapper
const { ResilientTTSClient, createResilientTTSClient } = require('./resilient-tts-client');

/**
 * Create complete Story Narrator system with resilient TTS
 * @param {Object} claudeClient - Anthropic Claude client
 * @param {Object} options - Configuration options
 * @returns {StoryManager} - Initialized story manager
 */
function createStoryNarrator(claudeClient, options = {}) {
  const defaultOptions = {
    enableStreaming: true,
    targetLatency: 400,
    defaultLanguage: 'en',
    ...options
  };

  const storyManager = createStoryManager(claudeClient, defaultOptions);

  // Wrap TTS engine with resilience if TTS providers are available
  if (options.ttsProviders) {
    const resilientTTS = createResilientTTSClient(
      { synthesize: options.ttsProviders.primary || options.ttsProviders },
      options
    );
    storyManager.setTTSEngine(resilientTTS);
  }

  console.log('[Story Narrator] Engine initialized');
  console.log(`  - Streaming: ${defaultOptions.enableStreaming ? 'enabled' : 'disabled'}`);
  console.log(`  - Target latency: ${defaultOptions.targetLatency}ms`);
  console.log(`  - Language: ${defaultOptions.defaultLanguage}`);
  console.log(`  - Resilience: ${options.ttsProviders ? 'enabled' : 'disabled'}`);

  return storyManager;
}

/**
 * Quick start helper
 * @param {Object} providers - TTS provider clients
 * @param {string} storyName - Story to narrate
 * @param {Object} options - Options
 */
async function quickStart(providers, storyName = 'dragon_quest', options = {}) {
  const Anthropic = require('@anthropic-ai/sdk');

  // Initialize Claude client
  const claudeClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Create story narrator
  const narrator = createStoryNarrator(claudeClient, options);

  // Initialize providers
  narrator.initializeProviders(providers);

  // Get story
  const story = getStory(storyName, options.language || 'en');

  // Narrate
  const result = await narrator.narrateStory(story);

  return {
    narrator,
    result
  };
}

module.exports = {
  // Main entry point
  createStoryNarrator,
  quickStart,

  // Core components
  StoryManager,
  StoryOrchestrator,
  VoiceProfileManager,
  StreamingTTSEngine,
  AudioStreamPlayer,

  // Resilience wrapper
  ResilientTTSClient,
  createResilientTTSClient,

  // Configuration
  CHARACTER_VOICES,
  EMOTION_PROFILES,

  // Stories
  getStory,
  getAllStories,
  getRandomStory
};
