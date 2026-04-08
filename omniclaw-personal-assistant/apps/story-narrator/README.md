# Story Narrator Engine v2.0

**Multi-Character AI Storytelling with Persona-Based Voice Synthesis**

---

## 🎯 Overview

The Story Narrator Engine is a cloud-native storytelling system that generates immersive, multi-character audio narratives using AI. It combines dynamic story generation with character-specific voice synthesis to create engaging experiences.

**Live Endpoint**: `https://omniclaw-story-narrator-338789220059.asia-south1.run.app`

**Alexa Integration**: Available via OmniClaw Alexa Skill (`omniclaw`)

---

## ✨ Key Capabilities

### 1. **Dynamic Story Generation**
- AI-powered narrative generation with themes, settings, and plot outlines
- Automatic character creation with distinct personalities and speech patterns
- Support for multiple languages: English, Hindi (Hinglish), Bengali

### 2. **Persona-Based Voice Synthesis**
Six distinct character voice profiles with unique acoustic properties:

| Persona | Description | Speed | Pitch | Volume | Use Case |
|---------|-------------|-------|-------|--------|----------|
| **NARRATOR** | Professional storytelling | 1.0x | 1.0x | 1.0x | Story descriptions, scene setting |
| **HERO** | Strong, confident protagonist | 1.0x | 1.15x | 1.1x | Main character dialogue |
| **VILLAIN** | Deep, menacing antagonist | 0.9x | 0.75x | 1.0x | Threatening dialogue |
| **SIDEKICK** | Cheerful, energetic companion | 1.1x | 1.2x | 1.05x | Comic relief, banter |
| **WISE_OLD_MAN** | Slow, deliberate mentor | 0.85x | 0.8x | 1.0x | Wisdom, guidance |
| **MYSTICAL_CREATURE** | Ethereal, otherworldly | 0.95x | 1.3x | 0.9x | Fantasy elements |

### 3. **Emotional Modulation**
Each persona supports 4 emotional states that modify voice parameters:

| Emotion | Speed | Pitch | Volume | Characteristics |
|---------|-------|-------|--------|-----------------|
| **neutral** | 1.0x | 1.0x | 1.0x | Default delivery |
| **excited** | 1.1x | 1.05x | 1.1x | Enthusiastic, energetic |
| **sad** | 0.9x | 0.95x | 0.9x | Melancholic, subdued |
| **mysterious** | 0.95x | 0.98x | 0.95x | Ominous, suspenseful |

### 4. **Streaming Audio**
- Real-time audio generation with sub-second latency
- Progressive streaming for immediate playback
- Buffer management for seamless narrative flow

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Alexa Skill                               │
│              (Personal Assistant "omniclaw")                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Intent: GenerateStoryIntent
                          │          NarrateStoryIntent
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│               OmniClaw Cloud Function                            │
│         (GCP Cloud Functions Gen2 - Node.js 22)                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              StoryNarratorClient                         │   │
│  │         (REST API Client Wrapper)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS POST /generate
                          │          /narrate
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│           Story Narrator Cloud Run Service                       │
│              (GCP Cloud Run - Node.js 22)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Story      │  │    Voice     │  │      TTS             │  │
│  │ Orchestrator │  │   Profile    │  │    Streaming         │  │
│  │  (Claude)    │  │   Manager    │  │      Engine          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  ElevenLabs  │  │    Google    │  │      MiniMax         │  │
│  │   (Primary)  │  │    TTS       │  │       TTS            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "service": "story-narrator",
  "timestamp": "2026-04-09T00:00:00.000Z",
  "ttsProviders": {
    "elevenlabs": { "configured": false, "circuitOpen": false, "failures": 0 },
    "google": { "configured": true, "circuitOpen": false, "failures": 0 },
    "minimax": { "configured": false, "circuitOpen": false, "failures": 0 }
  }
}
```

### Generate Story
```bash
POST /generate
Content-Type: application/json

{
  "theme": "space adventure",
  "setting": "distant galaxy",
  "plotOutline": "explorers find new planet",
  "characters": ["Captain Nova", "Robot R2"],
  "language": "hinglish"
}
```

Response:
```json
{
  "success": true,
  "storyId": "story_1775680830680_qscl4v9f8",
  "theme": "space adventure",
  "segmentCount": 24,
  "characters": [
    {
      "name": "Captain Jaxon Lee",
      "role": "Leader of the exploration team",
      "personality": "confident, charismatic, determined",
      "speechPattern": "authoritative tone, moderate pace, slight southern accent",
      "quirks": ["often pauses before making important decisions"]
    },
    {
      "name": "Dr. Sophia Patel",
      "role": "Chief Scientist and planetologist",
      "personality": "curious, analytical, enthusiastic",
      "speechPattern": "fast-paced, high-pitched, Indian accent",
      "quirks": ["uses technical jargon in everyday conversations"]
    }
  ]
}
```

### Narrate Content
```bash
POST /narrate
Content-Type: application/json

{
  "content": "Captain Jaxon Lee stood at the bridge, gazing at the new planet.",
  "voice": "NARRATOR",
  "language": "en"
}
```

Response: Audio stream (audio/webm, audio/mp3, or audio/ogg)

### Synthesize Speech
```bash
POST /synthesize
Content-Type: application/json

{
  "text": "The hero's journey continues...",
  "voice": "HERO",
  "language": "en"
}
```

Response: Audio buffer (application/json with base64 or direct audio)

---

## 🎭 Voice Persona Details

### NARRATOR
**Profile**: Professional storytelling voice for immersive narrative experiences
```javascript
voiceConfig: {
  voiceId: 'eleven_multilingual_v2',
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0
}
```

### HERO
**Profile**: Strong, confident protagonist voice
```javascript
voiceConfig: {
  voiceId: 'eleven_turbo_v2',
  stability: 0.4,
  similarity_boost: 0.8,
  style: 0.5,
  use_speaker_boost: true,
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
```

### VILLAIN
**Profile**: Deep, menacing antagonist voice
```javascript
voiceConfig: {
  voiceId: 'eleven_multilingual_v2',
  stability: 0.6,
  similarity_boost: 0.85,
  style: 0.7,
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
```

### SIDEKICK
**Profile**: Cheerful, energetic companion
```javascript
voiceConfig: {
  voiceId: 'eleven_turbo_v2',
  stability: 0.3,
  similarity_boost: 0.7,
  style: 0.6,
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
```

### WISE_OLD_MAN
**Profile**: Slow, deliberate mentor figure
```javascript
voiceConfig: {
  voiceId: 'eleven_multilingual_v2',
  stability: 0.7,
  similarity_boost: 0.9,
  style: 0.2,
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
```

### MYSTICAL_CREATURE
**Profile**: Ethereal, otherworldly voice
```javascript
voiceConfig: {
  voiceId: 'eleven_multilingual_v2',
  stability: 0.2,
  similarity_boost: 0.6,
  style: 0.8,
  speed: 0.95,
  pitch: 1.3,
  volume: 0.9
},
emotionModifiers: {
  neutral: { speed: 0.95, pitch: 1.3, volume: 0.9 },
  mysterious: { speed: 0.9, pitch: 1.35, volume: 0.85 },
  powerful: { speed: 1.0, pitch: 1.25, volume: 1.1 }
}
```

---

## 🌍 Language Support

| Language | Code | Status | TTS Provider |
|----------|------|--------|---------------|
| English | `en` | ✅ Full | ElevenLabs / Google |
| Hindi | `hi` | ✅ Full | Google / Sarvam |
| Hinglish | `hinglish` | ✅ Full | Google |
| Bengali | `bn` | ✅ Full | Google |

---

## 🎮 Alexa Integration

### Intent Handlers

#### GenerateStoryIntent
**Alexa Invocation**: "generate a story", "tell me a story"

**Slot Values**:
- `Theme` (required): Story theme or genre
- `Setting` (optional): Story setting/location
- `PlotOutline` (optional): Brief plot description
- `Characters` (optional): Comma-separated character names
- `Language` (optional): en, hi, bn, hinglish

**Example**: *"Alexa, ask OmniClaw to generate a space adventure story with Captain Nova"*

#### NarrateStoryIntent
**Alexa Invocation**: "narrate", "read this story"

**Slot Values**:
- `StoryContent` (required): Text to narrate
- `Voice` (optional): NARRATOR, HERO, VILLAIN, SIDEKICK, WISE_OLD_MAN, MYSTICAL_CREATURE
- `Language` (optional): en, hi, bn, hinglish

**Example**: *"Alexa, ask OmniClaw to narrate 'The hero stood on the mountain' with the hero voice"*

#### NarrateURLIntent
**Alexa Invocation**: "narrate this URL", "read this link"

**Slot Values**:
- `Url` (required): URL to fetch and narrate
- `Voice` (optional): Voice persona to use
- `Language` (optional): Language code

---

## 📊 Performance Metrics

### TTS Provider Status
```
ElevenLabs:  Not configured (circuit closed)
Google TTS:  ✅ Active (primary)
MiniMax:     Not configured
Sarvam:      Not configured
```

### Response Times
- Story Generation: ~2-5 seconds (depends on complexity)
- TTS Synthesis: <500ms for typical sentences
- Streaming Initiation: <1 second

---

## 🚀 Deployment

### Cloud Run Service
```bash
# Build and deploy
cd apps/story-narrator
gcloud run deploy omniclaw-story-narrator \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

### Environment Variables
```bash
ANTHROPIC_API_KEY=        # For story generation (Claude)
ELEVENLABS_API_KEY=       # Primary TTS
GOOGLE_APPLICATION_CREDENTIALS=  # Google Cloud TTS
SARVAM_API_KEY=           # Indian language TTS
MINIMAX_API_KEY=          # MiniMax TTS fallback
```

---

## 🧪 Testing

### Quick Test
```bash
# Test story generation
curl -X POST "https://omniclaw-story-narrator-338789220059.asia-south1.run.app/generate" \
  -H "Content-Type: application/json" \
  -d '{"theme": "space adventure", "language": "en"}'

# Test narration
curl -X POST "https://omniclaw-story-narrator-338789220059.asia-south1.run.app/narrate" \
  -H "Content-Type: application/json" \
  -d '{"content": "Once upon a time...", "voice": "NARRATOR"}'
```

### Run Test Suite
```bash
cd apps/story-narrator
npm test
```

---

## 📁 Project Structure

```
apps/story-narrator/
├── index.js                    # Main entry point
├── server.js                   # HTTP server setup
├── package.json                # NPM configuration
├── Dockerfile                  # Container build
├── orchestrator/
│   ├── story-orchestrator.js   # AI story generation
│   └── story-manager.js       # Pipeline orchestration
├── voices/
│   └── character-profiles.js   # Voice persona definitions
├── tts/
│   └── streaming-tts-engine.js # Audio streaming engine
├── resilient-tts-client.js     # Multi-provider TTS client
├── shared/                     # Shared utilities
├── stories/                    # Demo story templates
├── tests/                      # Test suite
└── examples/                   # Usage examples
```

---

## 🔧 Configuration

### Voice Profile Customization
```javascript
const { CHARACTER_VOICES } = require('./voices/character-profiles');

// Customize HERO voice
CHARACTER_VOICES.HERO.voiceConfig.stability = 0.6;
CHARACTER_VOICES.HERO.voiceConfig.style = 0.7;

// Add custom emotion
CHARACTER_VOICES.HERO.emotionModifiers.triumphant = {
  speed: 1.1, pitch: 1.2, volume: 1.15
};
```

### TTS Provider Priority
```javascript
const narrator = createStoryNarrator(claudeClient, {
  providers: {
    priority: ['elevenlabs', 'google', 'minimax'],
    timeout: 5000,
    retryAttempts: 3
  }
});
```

---

## 🎯 Use Cases

1. **Voice-First Storytelling**: Alexa/Smart speaker audio stories
2. **Audiobook Creation**: Generate narrated audio from text
3. **Language Learning**: Immersive stories with distinct character voices
4. **Accessibility**: Enhanced storytelling for visually impaired users
5. **Interactive Fiction**: Choice-based branching narratives
6. **Character-Driven Content**: Marketing, training, educational content

---

## 📝 Changelog

### v2.0 (2026-04-09)
- ✅ Added 6th persona: MYSTICAL_CREATURE
- ✅ Added emotion modifiers to all personas
- ✅ Improved Alexa integration
- ✅ Cloud Run deployment ready
- ✅ Resilient TTS client with multi-provider fallback

### v1.0 (2026-03-24)
- ✅ Initial release
- ✅ 5 character voice profiles
- ✅ Streaming TTS engine
- ✅ Multi-language support
- ✅ Claude-powered story generation

---

## 📄 License

MIT License - OmniClaw Personal Assistant Project

---

## 🤝 Contributing

Contributions welcome! Please see main [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

**Status**: ✅ Production Ready
**Version**: 2.0.0
**Last Updated**: 2026-04-09
**Live Endpoint**: https://omniclaw-story-narrator-338789220059.asia-south1.run.app

*"Every story deserves to be told beautifully"*
