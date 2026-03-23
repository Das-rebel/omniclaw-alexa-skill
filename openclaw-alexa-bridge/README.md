# Personal Assistant - Alexa Bridge

A context-aware voice assistant for Amazon Alexa with multi-turn conversation support and natural language understanding.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Deployment](https://img.shields.io/badge/Google%20Cloud-Gen2-blue)](https://cloud.google.com/functions)
[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](https://cloud.google.com/functions)

## 🚀 Production Status

**✅ LIVE IN PRODUCTION**

**Deployed URL:** https://asia-south1-dauntless-glow-487412-s7.cloudfunctions.net/quantum-claw-v2-fixed

**Active Revision:** quantum-claw-v2-fixed-00014-pem (Deployed: 2026-03-23)

**Health Check:** https://asia-south1-dauntless-glow-487412-s7.cloudfunctions.net/quantum-claw-v2-fixed/health

**Active Providers:**
- ✅ GLMv2 (Claude Sonnet 4 via Z.ai)
- ✅ Tavily Search
- ✅ Reddit (AI simulation mode)

## 🌟 Key Features

### Context-Aware Conversations

Maintains conversation context across multiple turns:

```javascript
// Turn 1: Establish context
User: "Tell me about the Joe Rogan podcast with Elon Musk"
→ Context stored: { lastPodcast, lastEntity, lastQuery }

// Turn 2: Context resolution
User: "What are 5 key points from this podcast?"
→ "this podcast" automatically resolved to Joe Rogan with Elon Musk

// Turn 3: Extended conversation
User: "Tell me 3 more interesting points"
→ Continues with same topic

// Turn 4: Context switching
User: "What about the podcast with Terence Tao?"
→ Context updates to new topic
```

### Natural Language Understanding

- **Pronoun Resolution**: "this podcast", "it", "that" → Resolved to actual entities
- **Context Extraction**: Automatically tracks podcasts, people, topics
- **Session Memory**: Maintains conversation state across turns
- **Key Points Enhancement**: Formats responses as numbered lists

### Multi-Language Support

- **English**: Full support with all providers
- **Hindi**: Via Sarvam AI
- **Bengali**: Via Sarvam AI
- **Hinglish**: Mixed Hindi-English detection
- **Benglish**: Mixed Bengali-English detection

### Multi-Provider Routing

Intelligent routing to multiple AI providers:

- **Z.ai (Anthropic Claude)**: Claude Sonnet 4 via Z.ai proxy
- **Sarvam AI**: Indian language support
- **Tavily Search**: Real-time web search integration
- **Reddit**: Social media trends (AI simulation mode)

## 📖 Usage Examples

### Example 1: Multi-Turn Podcast Conversation

```javascript
// Turn 1
User: "Tell me about the Dwarkesh podcast with Ada Palmer"
Alexa: "This is a summary of the Dwarkesh Podcast episode featuring
historian, novelist, and composer Ada Palmer..."

// Turn 2 - Context resolution
User: "What are 5 key points from this podcast?"
Alexa: "Based on the analysis of Ada Palmer's work, here are 5 key points:
1. **Censorship as a Driver of Scientific Progress**...
2. **The Necessity of 'Useful Heresies'**...
3. ..."
→ "this podcast" was resolved to "Ada Palmer podcast"

// Turn 3 - Context switch
User: "What about the Dwarkesh podcast with Terence Tao?"
Alexa: "The episode featuring Terence Tao is widely considered one of
the best podcast episodes..."
→ Context switched successfully

// Turn 4 - Follow-up on new context
User: "What are 3 key points from this podcast?"
Alexa: "Based on the principles of Terence Tao, here are 3 key points:
1. **Mathematical Maturity**...
2. **Rigorous Thinking**...
..."
→ Now talking about Terence Tao (not Ada Palmer)
```

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│   Alexa     │
│  (Skill)    │
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│         Cloud Functions Gen 2 Handler                  │
│                                                         │
│  1. Request Processing                                  │
│     - Intent recognition                                │
│     - Session attribute extraction                      │
│     - Context resolution (pronoun → entity)             │
│                                                         │
│  2. Language Detection                                  │
│     - Hindi, Bengali, Hinglish, English                 │
│                                                         │
│  3. Query Enhancement                                   │
│     - Key points detection                              │
│     - Numbered list formatting                          │
│                                                         │
│  4. Multi-Provider Router                               │
│     - Z.ai (Claude Sonnet 4)                            │
│     - Sarvam (Indian languages)                         │
│     - Tavily (web search)                               │
│                                                         │
│  5. Response Synthesis                                  │
│     - Multi-source aggregation                          │
│     - Voice optimization                                │
│     - Confidence scoring                                │
│                                                         │
│  6. Context Management                                  │
│     - Extract context from responses                    │
│     - Store in session attributes                       │
│     - Return to Alexa for next turn                     │
└─────────────────────────────────────────────────────────┘
```

### Context Management

```javascript
// Incoming request with session attributes
{
  session: {
    attributes: {
      lastPodcast: "Ada Palmer",
      lastTopic: "Ada Palmer podcast",
      lastEntity: "Ada Palmer",
      lastQuery: "Summarize the Dwarkesh podcast with Ada Palmer"
    }
  },
  request: {
    intent: {
      slots: {
        Query: { value: "What are 5 key points from this podcast?" }
      }
    }
  }
}

// Context resolution
resolveContext("What are 5 key points from this podcast?", sessionAttributes)
→ "What are 5 key points from Ada Palmer podcast?"

// Query enhancement
→ "Please provide the 5 most interesting and important key points
   from 'Ada Palmer podcast'. Format as a numbered list..."

// Response + Context extraction
{
  sessionAttributes: {
    lastPodcast: "Ada Palmer",
    lastTopic: "Ada Palmer podcast",
    lastEntity: "Ada Palmer",
    lastQuery: "What are 5 key points from Ada Palmer podcast?"
  },
  response: {
    outputSpeech: { text: "1. **Point 1**...\n2. **Point 2**..." }
  }
}
```

## 📦 Installation

### Prerequisites

- Node.js 18+ installed
- Google Cloud account with Cloud Functions enabled
- Z.ai API key (required)
- Alexa Developer account

### Local Development

```bash
# Clone repository
git clone https://github.com/Das-rebel/openclaw-alexa-bridge.git
cd openclaw-alexa-bridge

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start local server
npm start

# Test health endpoint
curl http://localhost:3000/health
```

## 🚀 Deployment

### Google Cloud Functions

```bash
# Deploy to Google Cloud Functions Gen 2
gcloud functions deploy quantum-claw-v2-fixed \
  --gen2 \
  --region=asia-south1 \
  --runtime=nodejs22 \
  --source=. \
  --entry-point=alexaHandler \
  --trigger=http \
  --allow-unauthenticated \
  --memory=2048Mi \
  --timeout=120s \
  --max-instances=10
```

### Minimal Deployment (Faster)

```bash
# Create minimal deployment package
mkdir -p /tmp/quantum-deploy
cp cloud_fn_handler_v2.js package.json /tmp/quantum-deploy/
cp -r src /tmp/quantum-deploy/

# Deploy from minimal package
cd /tmp/quantum-deploy
gcloud functions deploy quantum-claw-v2-fixed \
  --gen2 \
  --region=asia-south1 \
  --runtime=nodejs22 \
  --entry-point=alexaHandler \
  --trigger=http \
  --allow-unauthenticated \
  --memory=2048Mi \
  --timeout=120s
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Primary AI Provider (Required)
ZAI_API_KEY=your_zai_api_key_here

# Optional Providers
SARVAM_API_KEY=your_sarvam_api_key      # Hindi/Bengali
TAVILY_API_KEY=your_tavily_api_key      # Web search

# Google Services
GOOGLE_API_KEY=your_google_api_key      # TTS, Translate

# Alexa Configuration
ALEXA_SKILL_ID=amzn1.ask.skill.your-skill-id

# Performance Settings
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000
```

## 🧪 Testing

### Run Test Suite

```bash
# Run all tests
npm test

# Run coverage
npm test -- --coverage
```

### Test Context Awareness

```bash
# Run live context-aware test
chmod +x test_alexa_context_live.sh
./test_alexa_context_live.sh
```

This tests:
1. Context establishment with Ada Palmer podcast
2. Pronoun resolution ("this podcast")
3. Extended conversation with follow-ups
4. Context switching to Terence Tao
5. Context maintenance on new topics

### Manual Testing

```bash
# Test query endpoint
curl -X POST \
  https://asia-south1-dauntless-glow-487412-s7.cloudfunctions.net/quantum-claw-v2-fixed/api/alexa \
  -H 'Content-Type: application/json' \
  -d '{
    "request": {
      "type": "IntentRequest",
      "intent": {
        "name": "QueryIntent",
        "slots": {
          "Query": { "value": "Tell me about the Joe Rogan podcast with Elon Musk" }
        }
      }
    },
    "session": {
      "sessionId": "test-session",
      "attributes": {},
      "user": { "userId": "test-user" }
    }
  }'
```

## 📚 API Reference

### POST /api/alexa

Main Alexa skill endpoint.

**Request:**
```json
{
  "request": {
    "type": "IntentRequest|LaunchRequest|SessionEndedRequest",
    "intent": {
      "name": "QueryIntent|PodcastIntent|SocialMediaSummaryIntent",
      "slots": {
        "Query": { "value": "user query" }
      }
    }
  },
  "session": {
    "sessionId": "session-id",
    "attributes": {
      "lastPodcast": "podcast name",
      "lastTopic": "topic",
      "lastEntity": "entity"
    },
    "user": { "userId": "user-id" }
  }
}
```

**Response:**
```json
{
  "version": "1.0",
  "sessionAttributes": {
    "lastPodcast": "podcast name",
    "lastTopic": "topic",
    "lastEntity": "entity",
    "lastQuery": "current query"
  },
  "response": {
    "outputSpeech": {
      "type": "PlainText",
      "text": "Alexa response"
    },
    "shouldEndSession": false
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "system": "Quantum-Claw Serverless Multi-Provider System",
  "version": "2.0.0",
  "providers": {
    "GLMv2": { "status": "healthy" },
    "Tavily": { "status": "healthy" },
    "Reddit": { "status": "healthy", "simulated": true }
  }
}
```

## 🔍 Troubleshooting

### Issue: Context Not Maintained

**Problem**: Follow-up questions don't remember previous context.

**Solution**:
1. Check that session attributes are returned in response
2. Verify Alexa sends them back in next request
3. Use explicit markers: "this podcast" instead of "it"

### Issue: Deployment Timeout

**Problem**: gcloud deployment times out after 7+ minutes.

**Solution**: Use minimal deployment package (see above).

### Issue: "SpeechletResponse was null"

**Problem**: Alexa returns null response error.

**Solution**: Root endpoint now handles Alexa requests automatically.
Verify your Alexa skill endpoint is correct.

## 📊 Performance

### Current Metrics (Production)

Based on health check data:

- **Response Time**: ~1.1s (GLM provider)
- **Tavily Search**: ~2.8s
- **Reddit Simulation**: ~1.7s
- **Memory**: 2048Mi allocated
- **Providers**: 3 healthy (GLM, Tavily, Reddit)

### Tested Scenarios

✅ Context establishment and maintenance
✅ Pronoun resolution ("this podcast", "it", "that")
✅ Multi-turn conversation support
✅ Context switching between topics
✅ Key points formatting with numbered lists
✅ Session attribute persistence

## 🛣️ Roadmap

### v2.1 (Planned)
- [ ] ML-based intent classification
- [ ] Enhanced context window (10+ turns)
- [ ] Fuzzy matching for typos
- [ ] Voice activity detection

### v2.2 (Future)
- [ ] Multi-user support
- [ ] Conversation history storage
- [ ] Personalization based on preferences
- [ ] Integration with more data sources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Author

**Subho Das**

## 🔗 Links

- [GitHub Repository](https://github.com/Das-rebel/openclaw-alexa-bridge)
- [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Z.ai Documentation](https://docs.z.ai/)

---

**Made with ❤️ for voice-first AI interactions**
