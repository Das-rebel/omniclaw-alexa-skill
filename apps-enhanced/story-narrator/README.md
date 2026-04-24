# Story Narrator Engine

**Phase 4: OmniClaw Personal Assistant**

Complete multi-character voice synthesis system with real-time streaming, emotional modulation, and interactive branching narratives.

---

## 🎯 Features

### ✨ Core Capabilities

- **Multi-Character TTS**: 5 distinct voice profiles (Narrator, Hero, Villain, Sidekick, Wise Old Man)
- **Emotional Modulation**: 7 emotion states (neutral, excited, sad, angry, whisper, happy, tense)
- **Streaming Playback**: <400ms latency target with sentence buffering
- **Interactive Stories**: User choice-based branching narratives
- **Character Persistence**: Consistent voices across story sessions
- **Indian Languages**: Hindi, Bengali story support

### 🎭 Character Voice Profiles

| Character | Voice Style | Use Case |
|-----------|-------------|----------|
| **NARRATOR** | Professional, steady | Story setting, descriptions |
| **HERO** | Strong, confident, higher pitch | Main protagonist dialogue |
| **VILLAIN** | Deep, menacing, slower | Antagonist threats |
| **SIDEKICK** | Cheerful, faster, higher | Companion banter |
| **WISE_OLD_MAN** | Slow, deliberate, lower | Mentor wisdom |

### 🎨 Emotional Modulation

| Emotion | Speed | Pitch | Volume | Use Case |
|---------|-------|-------|--------|----------|
| **neutral** | 1.0x | 1.0x | 1.0x | Standard narration |
| **excited** | 1.15x | 1.1x | 1.1x | Happy moments, discoveries |
| **sad** | 0.85x | 0.9x | 0.85x | Sorrowful scenes |
| **angry** | 1.1x | 1.2x | 1.15x | Conflict, battles |
| **whisper** | 0.9x | 0.95x | 0.5x | Secrets, quiet moments |
| **happy** | 1.05x | 1.05x | 1.05x | Joyful dialogue |
| **tense** | 0.95x | 1.0x | 0.95x | Suspenseful moments |

---

## 🏗️ Architecture

```
story-narrator/
├── orchestrator/
│   ├── story-orchestrator.js    # Story generation (Claude)
│   └── story-manager.js         # Complete pipeline orchestration
├── voices/
│   └── voice-profile-manager.js # Voice synthesis & emotion
├── tts/
│   └── streaming-tts-engine.js  # Low-latency streaming
├── stories/
│   └── demo-stories.js          # Pre-configured story templates
├── tests/
│   └── story-narrator-test.js   # Comprehensive test suite
└── index.js                     # Main entry point
```

### Components

1. **Story Orchestrator**
   - Uses Claude 4 Sonnet for narrative generation
   - Character consistency across sessions
   - Hero's Journey story structure
   - Voice-optimized content format

2. **Voice Profile Manager**
   - Multi-provider TTS (ElevenLabs, Azure, Sarvam)
   - Emotion parameter modulation
   - Automatic fallback on failures
   - Performance metrics tracking

3. **Streaming TTS Engine**
   - Sentence buffer strategy (28 tokens optimal)
   - Speaker change detection
   - Prefetch for faster streaming
   - Real-time audio playback

4. **Story Manager**
   - Complete pipeline orchestration
   - Interactive session management
   - State persistence
   - Event-driven architecture

---

## 🚀 Quick Start

### Installation

```bash
cd ~/omniclaw-enhanced
npm install
```

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Optional (for Indian languages)
SARVAM_API_KEY=your_sarvam_key

# Optional (Azure fallback)
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=your_region
```

### Basic Usage

```javascript
const { createStoryNarrator } = require('./apps/story-narrator');
const Anthropic = require('@anthropic-ai/sdk');
const ElevenLabs = require('elevenlabs');

// Initialize clients
const claudeClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const elevenLabsClient = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Create story narrator
const narrator = createStoryNarrator(claudeClient, {
  targetLatency: 400,
  enableStreaming: true
});

// Initialize TTS providers
narrator.initializeProviders({
  elevenLabs: elevenLabsClient
});

// Narrate a story
const result = await narrator.narrateStory({
  theme: 'Epic Fantasy Adventure',
  genre: 'fantasy',
  setting: 'A mystical kingdom with dragons',
  characters: ['NARRATOR', 'HERO', 'WISE_OLD_MAN', 'VILLAIN'],
  interactive: true
});

// Play the stream
await narrator.playStream(result.stream);
```

---

## 📖 Demo Stories

### Available Stories

#### English Stories
- `dragon_quest` - Epic fantasy adventure
- `space_exploration` - Sci-fi discovery
- `mystery_mansion` - Victorian mystery
- `jungle_expedition` - Amazon adventure
- `cyberpunk_heist` - Neon city heist

#### Hindi Stories
- `rajkumar_kahani` - राजकुमार की रोमांचक यात्रा
- `akbar_birbal` - अकबर बीरबल की कहानियाँ

#### Bengali Stories
- `thakumar_jhuli` - ঠাকুমার ঝুলি

### Using Demo Stories

```javascript
const { getStory } = require('./apps/story-narrator');

// Get specific story
const dragonStory = getStory('dragon_quest');

// Get story in different language
const hindiStory = getStory('rajkumar_kahani', 'hi');

// Narrate demo story
const result = await narrator.narrateStory(dragonStory);
```

---

## 🎮 Interactive Stories

### Creating Interactive Session

```javascript
// Create interactive story
const session = await narrator.createInteractiveSession({
  theme: 'Space Adventure',
  characters: ['NARRATOR', 'HERO', 'SIDEKICK'],
  interactive: true
});

// Play initial segment
await narrator.playStream(session.stream);

// Handle user choice
const choice = "Investigate the mysterious signal";
const nextSegment = await session.makeChoice(choice);

// Continue playing
// ... play nextSegment.audio
```

### Story Format with Decisions

```
[NARRATOR] The hero approaches a fork in the road. [neutral]
[HERO] Which path should I take? [uncertain]
[DECISION: Take the left path | Go right | Rest for a while]
```

---

## 🧪 Testing

### Run All Tests

```bash
cd ~/omniclaw-enhanced
node apps/story-narrator/tests/story-narrator-test.js
```

### Quick Smoke Test

```javascript
const { smokeTest } = require('./apps/story-narrator/tests/story-narrator-test');

await smokeTest();
// Output: 🔥 Smoke test passed!
```

### Test Coverage

- ✅ Story generation with Claude
- ✅ Character voice synthesis
- ✅ Emotion modulation
- ✅ Streaming TTS engine
- ✅ Buffering strategy
- ✅ Interactive branching
- ✅ Indian language stories
- ✅ Latency performance

---

## 📊 Performance Metrics

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **TTS Latency** | < 400ms | 🎯 Target |
| **P95 Latency** | < 600ms | 🎯 Target |
| **Buffer Hit Rate** | > 80% | 🎯 Target |
| **Story Generation** | < 30s | 🎯 Target |

### Measuring Performance

```javascript
// Get comprehensive metrics
const metrics = narrator.getMetrics();

console.log('Voice Performance:', metrics.voice);
console.log('Streaming Performance:', metrics.streaming);
console.log('Average Latency:', metrics.voice.averageLatency.toFixed(0) + 'ms');
console.log('P95 Latency:', metrics.voice.p95Latency.toFixed(0) + 'ms');
console.log('Success Rate:', (metrics.voice.successRate * 100).toFixed(1) + '%');
```

---

## 🔧 Configuration

### Voice Profile Settings

```javascript
const narrator = createStoryNarrator(claudeClient, {
  // Performance
  enableStreaming: true,
  targetLatency: 400,

  // Language
  defaultLanguage: 'en',

  // Story generation
  maxSegments: 50,
  segmentLength: 150,

  // Buffering
  prefetchSegments: 2
});
```

### Character Voice Customization

```javascript
const { CHARACTER_VOICES } = require('./apps/story-narrator');

// Modify character voice
CHARACTER_VOICES.HERO.baseSettings = {
  stability: 0.7,
  similarity_boost: 0.85,
  style: 0.5,
  use_speaker_boost: true
};
```

### Emotion Profile Tuning

```javascript
const { EMOTION_PROFILES } = require('./apps/story-narrator');

// Adjust emotion parameters
EMOTION_PROFILES.excited = {
  speed: 1.2,      // Increase speed
  pitch: 1.15,     // Higher pitch
  volume: 1.1,     // Louder
  stability: 0.6   // More expressive
};
```

---

## 🔌 Alexa Integration

### Adding Story Narrator to Alexa

```javascript
// In your Alexa skill handler
const { createStoryNarrator } = require('./apps/story-narrator');

// Initialize narrator
const narrator = createStoryNarrator(claudeClient);
narrator.initializeProviders({ elevenLabs: elevenLabsClient });

// Handle story intent
const StoryIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StoryIntent';
  },
  async handle(handlerInput) {
    const storyName = handlerInput.requestEnvelope.request.intent.slots.story.value;

    // Narrate story
    const result = await narrator.narrateStory(getStory(storyName));

    // Stream audio
    return handlerInput.responseBuilder
      .speak("Starting your story...")
      .withAudioPlayerPlay('REPLACE_ALL', audioUrl, 'story-token', 0)
      .getResponse();
  }
};
```

### Interactive Story Choices

```javascript
const ChoiceIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChoiceIntent';
  },
  async handle(handlerInput) {
    const choice = handlerInput.requestEnvelope.request.intent.slots.choice.value;

    // Continue story with choice
    const nextSegment = await session.makeChoice(choice);

    // Play next segment
    return handlerInput.responseBuilder
      .speak("Continuing story...")
      .withAudioPlayerPlay('ENQUEUE', nextSegment.audioUrl, 'choice-token', 0)
      .getResponse();
  }
};
```

---

## 🌍 Indian Language Support

### Hindi Stories

```javascript
const narrator = createStoryNarrator(claudeClient, {
  defaultLanguage: 'hi'
});

narrator.initializeProviders({
  elevenLabs: elevenLabsClient,
  sarvam: sarvamClient  // For better Hindi pronunciation
});

const hindiStory = getStory('rajkumar_kahani', 'hi');
const result = await narrator.narrateStory(hindiStory);
```

### Bengali Stories

```javascript
const bengaliStory = getStory('thakumar_jhuli', 'bn');
const result = await narrator.narrateStory(bengaliStory);
```

---

## 🛡️ Error Handling

### Graceful Degradation

The narrator automatically falls back on failures:

1. **Primary TTS fails** → Secondary provider (Azure)
2. **Secondary fails** → Cached audio if available
3. **All TTS fails** → Error message with retry option

### Example Error Handling

```javascript
try {
  const result = await narrator.narrateStory(storyConfig);
  await narrator.playStream(result.stream);
} catch (error) {
  if (error.message.includes('TTS')) {
    console.log('TTS failed, using fallback');
    // Fallback: text-only response
  } else if (error.message.includes('Claude')) {
    console.log('Story generation failed');
    // Fallback: pre-recorded story
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## 📈 Monitoring

### Event Listeners

```javascript
// Listen to playback events
narrator.on('segmentStart', (metadata) => {
  console.log(`Playing ${metadata.character} segment`);
});

narrator.on('segmentEnd', (metadata) => {
  console.log(`Finished in ${metadata.duration}ms`);
});

narrator.on('progress', (progress) => {
  console.log(`Progress: ${progress.segmentIndex}/${progress.totalSegments}`);
});

narrator.on('decision', (options) => {
  console.log('User choice needed:', options);
});

narrator.on('error', (error) => {
  console.error('Playback error:', error);
});
```

---

## 🎯 Use Cases

1. **Bedtime Stories**: Interactive stories for children
2. **Language Learning**: Immersive stories in different languages
3. **Audiobooks**: Custom multi-character narration
4. **Gaming**: RPG-style interactive adventures
5. **Education**: Historical reenactments with character voices
6. **Accessibility**: Enhanced storytelling for visually impaired

---

## 🔜 Future Enhancements

- [ ] Music/sound effects integration
- [ ] Voice cloning for custom characters
- [ ] Multi-user collaborative stories
- [ ] Story analytics (choices, completion rates)
- [ ] AR/VR visualization integration
- [ ] Real-time co-creation with users
- [ ] More emotion states (whisper, shout, etc.)
- [ ] Dialect and accent support

---

## 📝 API Reference

### StoryManager

```javascript
// Create story manager
const narrator = createStoryNarrator(claudeClient, options);

// Initialize providers
narrator.initializeProviders(providers);

// Narrate story
const result = await narrator.narrateStory(storyConfig);

// Create interactive session
const session = await narrator.createInteractiveSession(storyConfig);

// Play stream
await narrator.playStream(stream);

// Control playback
narrator.pause();
narrator.resume();
narrator.stop();

// Get metrics
const metrics = narrator.getMetrics();

// Save/load session
narrator.saveSession();
narrator.loadSession(storyId);
```

### Story Config

```javascript
{
  theme: string,           // Story theme
  genre: string,           // Fantasy, sci-fi, mystery, etc.
  setting: string,         // Story setting
  characters: string[],    // Character roles
  plotOutline: string,     // Optional plot guide
  interactive: boolean,    // Enable user choices
  language: string         // en, hi, bn, etc.
}
```

---

## 🤝 Contributing

See main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see main [LICENSE](../../LICENSE) for details.

---

**Status**: ✅ Implementation Complete
**Version**: 1.0.0
**Last Updated**: 2026-03-24
**Phase**: 4 of 5 - Story Narrator Engine

*"Every story deserves to be told beautifully"*
