/**
 * Story Narrator Engine - Quick Demo
 * Simple example to get started quickly
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

// Import story narrator components
const {
  createStoryNarrator,
  getStory,
  getAllStories
} = require('../index');

/**
 * Mock ElevenLabs client for demo
 * In production, replace with actual ElevenLabs SDK
 */
class MockElevenLabsClient {
  constructor() {
    this.requestCount = 0;
  }

  get textToSpeech() {
    return {
      convert: async (params) => {
        this.requestCount++;
        console.log(`  [TTS] Synthesizing: "${params.text.substring(0, 30)}..."`);
        await this._delay(300); // Simulate 300ms latency

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
 * Quick demo - narrate a simple story
 */
async function quickDemo() {
  console.log('🎭 Story Narrator Engine - Quick Demo\n');
  console.log('=' .repeat(50));

  try {
    // Step 1: Initialize Claude client
    console.log('\n📝 Step 1: Initializing Claude client...');
    const claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('   ✅ Claude client ready');

    // Step 2: Create story narrator
    console.log('\n🎙️ Step 2: Creating story narrator...');
    const narrator = createStoryNarrator(claudeClient, {
      targetLatency: 400,
      enableStreaming: true
    });
    console.log('   ✅ Story narrator created');

    // Step 3: Initialize TTS providers
    console.log('\n🔊 Step 3: Initializing TTS providers...');
    const mockElevenLabs = new MockElevenLabsClient();
    narrator.initializeProviders({
      elevenLabs: mockElevenLabs
    });
    console.log('   ✅ TTS providers ready');

    // Step 4: List available stories
    console.log('\n📚 Step 4: Available stories:');
    const stories = getAllStories();
    console.log(`   English: ${stories.english.join(', ')}`);
    console.log(`   Hindi: ${stories.hindi.join(', ')}`);
    console.log(`   Bengali: ${stories.bengali.join(', ')}`);

    // Step 5: Get a story
    console.log('\n📖 Step 5: Loading "Dragon Quest" story...');
    const storyConfig = getStory('dragon_quest');
    console.log(`   Theme: ${storyConfig.theme}`);
    console.log(`   Genre: ${storyConfig.genre}`);
    console.log(`   Characters: ${storyConfig.characters.join(', ')}`);

    // Step 6: Generate and narrate
    console.log('\n🎬 Step 6: Generating and narrating story...');
    const startTime = Date.now();

    const result = await narrator.narrateStory(storyConfig);
    const generationTime = Date.now() - startTime;

    console.log(`   ✅ Story generated in ${generationTime}ms`);
    console.log(`   📊 Segments: ${result.story.segments.length}`);
    console.log(`   🎭 Characters: ${result.story.characters.map(c => c.name).join(', ')}`);

    // Step 7: Show story segments
    console.log('\n📝 Step 7: Story segments (first 5):');
    const dialogueSegments = result.story.segments.filter(s => s.type === 'dialogue');
    dialogueSegments.slice(0, 5).forEach((segment, i) => {
      console.log(`   ${i + 1}. [${segment.character}] ${segment.text} [${segment.emotion}]`);
    });

    // Step 8: Show metrics
    console.log('\n📊 Step 8: Performance metrics:');
    const metrics = narrator.getMetrics();
    console.log(`   Voice Requests: ${metrics.voice.totalRequests}`);
    console.log(`   Average Latency: ${metrics.voice.averageLatency.toFixed(0)}ms`);
    console.log(`   Success Rate: ${(metrics.voice.successRate * 100).toFixed(1)}%`);

    // Step 9: Interactive demo
    if (result.story.interactive) {
      console.log('\n🎮 Step 9: Interactive story demo:');
      console.log('   This story supports user choices!');

      const session = await narrator.createInteractiveSession(storyConfig);
      console.log('   ✅ Interactive session created');
      console.log(`   Session ID: ${session.storyId}`);

      // Simulate user choice
      console.log('\n   Simulating user choice: "Attack the dragon"');
      const choiceResult = await session.makeChoice('Attack the dragon');
      console.log(`   ✅ Generated ${choiceResult.segment.text.length} chars of new content`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Demo completed successfully!\n');

    return result;

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Interactive story demo
 */
async function interactiveDemo() {
  console.log('🎮 Interactive Story Demo\n');
  console.log('=' .repeat(50));

  try {
    const claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const narrator = createStoryNarrator(claudeClient);
    narrator.initializeProviders({
      elevenLabs: new MockElevenLabsClient()
    });

    const storyConfig = getStory('space_exploration');
    console.log(`\n🚀 Story: ${storyConfig.theme}`);
    console.log(`📝 Setting: ${storyConfig.setting}`);

    const session = await narrator.createInteractiveSession(storyConfig);
    console.log(`✅ Session created: ${session.storyId}`);

    // Show initial segments
    console.log('\n📖 Initial story segments:');
    session.segments.slice(0, 3).forEach((seg, i) => {
      if (seg.type === 'dialogue') {
        console.log(`  ${i + 1}. [${seg.character}] ${seg.text}`);
      }
    });

    console.log('\n🎮 Available choices would appear here in real implementation');
    console.log('   User would select: "Investigate the signal" or "Ignore it"');

    console.log('\n' + '='.repeat(50));

  } catch (error) {
    console.error('\n❌ Interactive demo failed:', error.message);
    throw error;
  }
}

/**
 * Multi-language demo
 */
async function multiLanguageDemo() {
  console.log('🌍 Multi-Language Story Demo\n');
  console.log('=' .repeat(50));

  try {
    const claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Test English
    console.log('\n🇬🇧 Testing English story...');
    const enNarrator = createStoryNarrator(claudeClient, { defaultLanguage: 'en' });
    enNarrator.initializeProviders({ elevenLabs: new MockElevenLabsClient() });

    const enResult = await enNarrator.narrateStory(getStory('dragon_quest', 'en'));
    console.log(`   ✅ Generated ${enResult.story.segments.length} segments`);

    // Test Hindi
    console.log('\n🇮🇳 Testing Hindi story...');
    const hiNarrator = createStoryNarrator(claudeClient, { defaultLanguage: 'hi' });
    hiNarrator.initializeProviders({ elevenLabs: new MockElevenLabsClient() });

    const hiResult = await hiNarrator.narrateStory(getStory('rajkumar_kahani', 'hi'));
    console.log(`   ✅ Generated ${hiResult.story.segments.length} segments`);
    console.log(`   🎭 Theme: ${hiResult.story.theme}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Multi-language demo completed!\n');

  } catch (error) {
    console.error('\n❌ Multi-language demo failed:', error.message);
    throw error;
  }
}

/**
 * Main demo runner
 */
async function main() {
  const args = process.argv.slice(2);
  const demoType = args[0] || 'quick';

  switch (demoType) {
    case 'quick':
      await quickDemo();
      break;
    case 'interactive':
      await interactiveDemo();
      break;
    case 'multilang':
      await multiLanguageDemo();
      break;
    case 'all':
      console.log('🎭 Running all demos...\n');
      await quickDemo();
      console.log('\n' + '─'.repeat(50) + '\n');
      await interactiveDemo();
      console.log('\n' + '─'.repeat(50) + '\n');
      await multiLanguageDemo();
      break;
    default:
      console.log(`Usage: node quick-demo.js [quick|interactive|multilang|all]`);
      process.exit(1);
  }
}

// Run demo if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Demo failed:', error);
    process.exit(1);
  });
}

module.exports = {
  quickDemo,
  interactiveDemo,
  multiLanguageDemo
};
