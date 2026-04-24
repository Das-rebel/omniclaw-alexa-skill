/**
 * Story Narrator Engine Tests
 * Comprehensive test suite for all components
 */

const { StoryOrchestrator } = require('../orchestrator/story-orchestrator');
const { VoiceProfileManager } = require('../voices/voice-profile-manager');
const { StreamingTTSEngine } = require('../tts/streaming-tts-engine');
const { StoryManager } = require('../orchestrator/story-manager');
const { getStory, getAllStories } = require('../stories/demo-stories');

/**
 * Mock Claude client for testing
 */
class MockClaudeClient {
  constructor() {
    this.responseCount = 0;
  }

  get messages() {
    return {
      create: async (params) => {
        this.responseCount++;

        // Generate mock story response
        return {
          content: [{
            text: this._generateMockStory(params)
          }]
        };
      }
    };
  }

  _generateMockStory(params) {
    const prompt = params.messages[0].content;

    if (prompt.includes('interactive')) {
      return `
[NARRATOR] In a land of dragons and magic, a young hero begins their journey. [neutral]
[HERO] I am ready to face any challenge that lies ahead! [excited]
[WISE_OLD_MAN] Patience, young one. The path is treacherous. [calm]
[SCENE: A dark forest with glowing mushrooms]
[VILLAIN] You shall not pass! [angry]
[HERO] I must continue forward, no matter the danger! [determined]
[PAUSE: 2s]
[NARRATOR] The hero draws their sword, ready for battle. [tense]
[DECISION: Attack head-on | Use stealth | Call for help]
      `.trim();
    }

    return `
[NARRATOR] Once upon a time, in a kingdom far away, there lived a brave knight. [neutral]
[HERO] I swear to protect this kingdom from all threats! [excited]
[WISE_OLD_MAN] Your courage is admirable, but wisdom is equally important. [calm]
[SCENE: The castle gates at dawn]
[VILLAIN] Soon, everything you love will be mine! [menacing]
[HERO] I will stop you, no matter what it takes! [determined]
[NARRATOR] And so began the greatest adventure the kingdom had ever known. [epic]
    `.trim();
  }
}

/**
 * Mock TTS providers
 */
class MockElevenLabsClient {
  constructor() {
    this.synthesisCount = 0;
    this.latency = 300; // Simulate 300ms latency
  }

  get textToSpeech() {
    return {
      convert: async (params) => {
        this.synthesisCount++;
        await this._delay(this.latency);

        // Return mock audio buffer
        return {
          arrayBuffer: async () => {
            return Buffer.from('mock-audio-data');
          }
        };
      }
    };
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test suite
 */
class StoryNarratorTestSuite {
  constructor() {
    this.results = [];
    this.mockClaude = new MockClaudeClient();
    this.mockElevenLabs = new MockElevenLabsClient();
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('\n=== Story Narrator Engine Test Suite ===\n');

    await this.testStoryOrchestrator();
    await this.testVoiceProfileManager();
    await this.testStreamingEngine();
    await this.testStoryManager();
    await this.testLatencyPerformance();
    await this.testInteractiveStories();
    await this.testIndianLanguages();

    this.printSummary();
  }

  /**
   * Test Story Orchestrator
   */
  async testStoryOrchestrator() {
    console.log('📖 Testing Story Orchestrator...');

    try {
      const orchestrator = new StoryOrchestrator(this.mockClaude, {
        language: 'en'
      });

      const story = await orchestrator.generateStory(getStory('dragon_quest'));

      this.assert(story.segments.length > 0, 'Story has segments');
      this.assert(story.characters.length > 0, 'Story has characters');
      this.assert(story.interactive === true, 'Story is interactive');

      this.recordResult('Story Orchestrator', true, 'Story generation working');

    } catch (error) {
      this.recordResult('Story Orchestrator', false, error.message);
    }
  }

  /**
   * Test Voice Profile Manager
   */
  async testVoiceProfileManager() {
    console.log('🎙️ Testing Voice Profile Manager...');

    try {
      const voiceManager = new VoiceProfileManager({
        targetLatency: 400
      });

      voiceManager.initialize({
        elevenLabs: this.mockElevenLabs
      });

      const segment = {
        character: 'HERO',
        emotion: 'excited',
        text: 'Hello, brave adventurer!'
      };

      const audio = await voiceManager.synthesizeSegment(segment);

      this.assert(Buffer.isBuffer(audio), 'Audio is buffer');
      this.assert(voiceManager.getMetrics().totalRequests === 1, 'Request counted');

      const metrics = voiceManager.getMetrics();
      this.assert(metrics.averageLatency > 0, 'Latency measured');

      this.recordResult('Voice Profile Manager', true, `Latency: ${metrics.averageLatency.toFixed(0)}ms`);

    } catch (error) {
      this.recordResult('Voice Profile Manager', false, error.message);
    }
  }

  /**
   * Test Streaming TTS Engine
   */
  async testStreamingEngine() {
    console.log('🔄 Testing Streaming TTS Engine...');

    try {
      const voiceManager = new VoiceProfileManager();
      voiceManager.initialize({ elevenLabs: this.mockElevenLabs });

      const streamingEngine = new StreamingTTSEngine(voiceManager);

      const segments = [
        { type: 'dialogue', character: 'NARRATOR', emotion: 'neutral', text: 'Once upon a time', estimatedDuration: 2 },
        { type: 'pause', duration: 1 },
        { type: 'dialogue', character: 'HERO', emotion: 'excited', text: 'I am ready!', estimatedDuration: 1.5 }
      ];

      const processed = await streamingEngine.processWithBuffering(segments);

      this.assert(processed.length > 0, 'Segments processed');
      this.assert(streamingEngine.getMetrics().segmentsProcessed > 0, 'Metrics tracked');

      this.recordResult('Streaming TTS Engine', true, 'Buffering working');

    } catch (error) {
      this.recordResult('Streaming TTS Engine', false, error.message);
    }
  }

  /**
   * Test Story Manager
   */
  async testStoryManager() {
    console.log('🎯 Testing Story Manager...');

    try {
      const storyManager = new StoryManager(this.mockClaude, {
        enableStreaming: false
      });

      storyManager.initializeProviders({
        elevenLabs: this.mockElevenLabs
      });

      const result = await storyManager.narrateStory(getStory('mystery_mansion'));

      this.assert(result.story.segments.length > 0, 'Story narrated');
      this.assert(result.readyForPlayback === true, 'Ready for playback');

      const state = storyManager.getStoryState();
      this.assert(state.currentStory !== null, 'Story state available');

      this.recordResult('Story Manager', true, 'End-to-end pipeline working');

    } catch (error) {
      this.recordResult('Story Manager', false, error.message);
    }
  }

  /**
   * Test latency performance
   */
  async testLatencyPerformance() {
    console.log('⏱️ Testing Latency Performance...');

    try {
      const voiceManager = new VoiceProfileManager({ targetLatency: 400 });
      voiceManager.initialize({ elevenLabs: this.mockElevenLabs });

      // Test 10 segments
      const segments = Array(10).fill(null).map((_, i) => ({
        character: ['NARRATOR', 'HERO', 'VILLAIN'][i % 3],
        emotion: 'neutral',
        text: `Test segment ${i + 1}`
      }));

      const startTime = Date.now();
      for (const segment of segments) {
        await voiceManager.synthesizeSegment(segment);
      }
      const totalTime = Date.now() - startTime;
      const avgLatency = totalTime / segments.length;

      this.assert(avgLatency < 500, `Average latency ${avgLatency.toFixed(0)}ms < 500ms`);

      const metrics = voiceManager.getMetrics();
      this.assert(metrics.p95Latency < 600, `P95 latency ${metrics.p95Latency.toFixed(0)}ms < 600ms`);

      this.recordResult('Latency Performance', true, `Avg: ${avgLatency.toFixed(0)}ms, P95: ${metrics.p95Latency.toFixed(0)}ms`);

    } catch (error) {
      this.recordResult('Latency Performance', false, error.message);
    }
  }

  /**
   * Test interactive stories
   */
  async testInteractiveStories() {
    console.log('🎮 Testing Interactive Stories...');

    try {
      const storyManager = new StoryManager(this.mockClaude);
      storyManager.initializeProviders({ elevenLabs: this.mockElevenLabs });

      const session = await storyManager.createInteractiveSession(getStory('space_exploration'));

      this.assert(session.storyId !== undefined, 'Session created');
      this.assert(session.makeChoice !== undefined, 'Choice handler available');

      // Test user choice
      const choiceResult = await session.makeChoice('Investigate the signal');
      this.assert(choiceResult.segment !== undefined, 'Choice generated new segment');

      this.recordResult('Interactive Stories', true, 'Branching working');

    } catch (error) {
      this.recordResult('Interactive Stories', false, error.message);
    }
  }

  /**
   * Test Indian language stories
   */
  async testIndianLanguages() {
    console.log('🇮🇳 Testing Indian Languages...');

    try {
      const orchestrator = new StoryOrchestrator(this.mockClaude, {
        language: 'hi'
      });

      const story = await orchestrator.generateStory(getStory('rajkumar_kahani', 'hi'));

      this.assert(story.segments.length > 0, 'Hindi story generated');
      this.assert(story.theme.includes('राजकुमार') || story.theme.includes('kumar'), 'Hindi theme present');

      this.recordResult('Indian Languages', true, 'Hindi story generation working');

    } catch (error) {
      this.recordResult('Indian Languages', false, error.message);
    }
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Record test result
   */
  recordResult(testName, passed, details) {
    this.results.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });

    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n=== Test Summary ===\n');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass Rate: ${passRate}%\n`);

    console.log('Detailed Results:');
    this.results.forEach(r => {
      console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.details}`);
    });

    console.log('\n=== End of Test Suite ===\n');
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }
}

/**
 * Run tests
 */
async function runTests() {
  const suite = new StoryNarratorTestSuite();
  await suite.runAllTests();
  return suite.getResults();
}

/**
 * Quick smoke test
 */
async function smokeTest() {
  console.log('🔥 Running smoke test...\n');

  const mockClaude = new MockClaudeClient();
  const mockElevenLabs = new MockElevenLabsClient();

  const storyManager = new StoryManager(mockClaude);
  storyManager.initializeProviders({ elevenLabs: mockElevenLabs });

  const result = await storyManager.narrateStory(getStory('dragon_quest'));

  console.log('✅ Smoke test passed!');
  console.log(`   - Generated ${result.story.segments.length} segments`);
  console.log(`   - Story ID: ${result.story.id}`);
  console.log(`   - Characters: ${result.story.characters.map(c => c.name).join(', ')}`);

  return result;
}

module.exports = {
  StoryNarratorTestSuite,
  runTests,
  smokeTest,
  MockClaudeClient,
  MockElevenLabsClient
};
