/**
 * Story Manager - Complete Story Narration Pipeline
 * Orchestrates story generation, voice synthesis, and streaming playback
 */

const { StoryOrchestrator } = require('./story-orchestrator');
const { VoiceProfileManager } = require('../voices/voice-profile-manager');
const { StreamingTTSEngine, AudioStreamPlayer } = require('../tts/streaming-tts-engine');

/**
 * Story Manager Class
 */
class StoryManager {
  constructor(claudeClient, options = {}) {
    this.options = {
      enableStreaming: options.enableStreaming !== false,
      targetLatency: options.targetLatency || 400,
      defaultLanguage: options.defaultLanguage || 'en',
      ...options
    };

    // Initialize components
    this.orchestrator = new StoryOrchestrator(claudeClient, {
      language: this.options.defaultLanguage
    });

    this.voiceManager = new VoiceProfileManager({
      targetLatency: this.options.targetLatency,
      defaultLanguage: this.options.defaultLanguage
    });

    this.streamingEngine = new StreamingTTSEngine(this.voiceManager, {
      enableStreaming: this.options.enableStreaming
    });

    this.player = new AudioStreamPlayer({
      autoPlay: true
    });

    // State management
    this.isPlaying = false;
    this.currentStory = null;
    this.playbackHistory = [];

    // Performance tracking
    this.performanceMetrics = {
      storiesGenerated: 0,
      segmentsSynthesized: 0,
      totalLatency: 0,
      averageLatency: 0
    };
  }

  /**
   * Initialize TTS providers
   * @param {Object} providers - TTS provider clients
   */
  initializeProviders(providers) {
    this.voiceManager.initialize(providers);
    console.log('[StoryManager] TTS providers initialized');
  }

  /**
   * Create and narrate a complete story
   * @param {Object} storyConfig - Story configuration
   * @returns {Promise<Object>} - Story narration result
   */
  async narrateStory(storyConfig) {
    const startTime = Date.now();
    console.log('[StoryManager] Starting story narration');

    try {
      // Step 1: Generate story
      console.log('[StoryManager] Step 1: Generating story...');
      const story = await this.orchestrator.generateStory(storyConfig);
      this.currentStory = story;

      // Step 2: Process with buffering (if not streaming)
      if (!this.options.enableStreaming) {
        console.log('[StoryManager] Step 2: Processing segments with buffering...');
        const processedSegments = await this.streamingEngine.processWithBuffering(story.segments);

        // Add to playback queue
        this.playbackHistory.push({
          story,
          processedSegments,
          timestamp: new Date().toISOString()
        });

        return {
          story,
          segments: processedSegments,
          readyForPlayback: true
        };
      }

      // Step 3: Stream directly
      console.log('[StoryManager] Step 2: Starting direct stream...');
      const stream = this.streamingEngine.streamSegments(story.segments);

      return {
        story,
        stream,
        streaming: true
      };

    } catch (error) {
      console.error('[StoryManager] Narration failed:', error);
      throw error;
    }
  }

  /**
   * Play story stream
   * @param {AsyncIterator} stream - Story audio stream
   * @returns {Promise<void>}
   */
  async playStream(stream) {
    console.log('[StoryManager] Starting playback');
    this.isPlaying = true;

    try {
      await this.player.playStream(stream);
      console.log('[StoryManager] Playback complete');
    } catch (error) {
      console.error('[StoryManager] Playback error:', error);
      throw error;
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Create interactive story session
   * @param {Object} storyConfig - Story configuration
   * @returns {Promise<Object>} - Interactive story session
   */
  async createInteractiveSession(storyConfig) {
    console.log('[StoryManager] Creating interactive story session');

    const story = await this.orchestrator.generateStory({
      ...storyConfig,
      interactive: true
    });

    this.currentStory = story;

    return {
      storyId: story.id,
      theme: story.theme,
      segments: story.segments,
      characters: story.characters,
      makeChoice: async (choice) => {
        return await this.handleUserChoice(choice);
      }
    };
  }

  /**
   * Handle user choice in interactive story
   * @param {string} choice - User's choice
   * @returns {Promise<Object>} - Next story segment
   */
  async handleUserChoice(choice) {
    if (!this.currentStory || !this.currentStory.interactive) {
      throw new Error('No active interactive story');
    }

    console.log(`[StoryManager] User choice: "${choice}"`);

    // Generate next segment
    const nextSegment = await this.orchestrator.generateNextSegment(choice);

    // Synthesize audio
    const audio = await this.voiceManager.synthesizeSegment(nextSegment);

    return {
      segment: nextSegment,
      audio
    };
  }

  /**
   * Get story state
   */
  getStoryState() {
    return {
      currentStory: this.orchestrator.getStoryState(),
      isPlaying: this.isPlaying,
      voiceMetrics: this.voiceManager.getMetrics(),
      streamMetrics: this.streamingEngine.getMetrics(),
      performance: this.performanceMetrics
    };
  }

  /**
   * Save current story session
   */
  saveSession() {
    if (this.currentStory) {
      this.orchestrator.saveStory();
      console.log('[StoryManager] Session saved');
    }
  }

  /**
   * Load story session
   * @param {string} storyId - Story ID to load
   */
  loadSession(storyId) {
    const story = this.orchestrator.loadStory(storyId);
    if (story) {
      this.currentStory = story;
      console.log('[StoryManager] Session loaded');
    }
    return story;
  }

  /**
   * Stop current playback
   */
  stop() {
    if (this.player) {
      this.player.stop();
    }
    this.isPlaying = false;
    console.log('[StoryManager] Stopped');
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.player) {
      this.player.pause();
    }
    this.isPlaying = false;
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.player) {
      this.player.resume();
    }
    this.isPlaying = true;
  }

  /**
   * Reset story manager
   */
  reset() {
    this.stop();
    this.orchestrator.reset();
    this.voiceManager.resetMetrics();
    this.streamingEngine.reset();
    this.currentStory = null;
    this.playbackHistory = [];
    console.log('[StoryManager] Reset complete');
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      performance: this.performanceMetrics,
      voice: this.voiceManager.getMetrics(),
      streaming: this.streamingEngine.getMetrics(),
      story: this.orchestrator.getStoryState()
    };
  }

  /**
   * Register event listeners
   */
  on(event, callback) {
    if (this.player) {
      this.player.on(event, callback);
    }
    if (this.streamingEngine) {
      this.streamingEngine.on(event, callback);
    }
  }

  /**
   * Remove event listeners
   */
  off(event, callback) {
    if (this.player) {
      this.player.off(event, callback);
    }
    if (this.streamingEngine) {
      this.streamingEngine.off(event, callback);
    }
  }
}

/**
 * Factory function to create Story Manager
 */
function createStoryManager(claudeClient, options = {}) {
  return new StoryManager(claudeClient, options);
}

module.exports = {
  StoryManager,
  createStoryManager
};
