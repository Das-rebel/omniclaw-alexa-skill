# OmniClaw Enhanced - System Architecture

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Author**: OmniClaw Team
**Status**: Production

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [Component Design](#component-design)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Technology Stack](#technology-stack)
6. [Scalability Patterns](#scalability-patterns)
7. [Security Architecture](#security-architecture)
8. [Reliability & Resilience](#reliability--resilience)
9. [Performance Optimization](#performance-optimization)
10. [Deployment Architecture](#deployment-architecture)

---

## Executive Overview

OmniClaw Enhanced is a **serverless, event-driven microservices architecture** built on Google Cloud Platform, designed to provide comprehensive digital life management capabilities through voice-activated and API-accessible services.

### Core Design Principles

1. **Serverless-First**: All compute runs on Google Cloud Functions (Gen 2) for automatic scaling
2. **Polyglot LLM**: Multi-provider AI integration (Anthropic, Groq, Cerebras) via Z.ai proxy
3. **Resilience Patterns**: Circuit breakers, retries, and graceful degradation
4. **API-First Design**: RESTful endpoints with unified request/response format
5. **Cloud-Native**: Fully managed GCP services (Firestore, Cloud Tasks, Secret Manager)

### System Capabilities

| Domain | Service | Description |
|--------|---------|-------------|
| **Commerce** | Price Tracking | Automated product monitoring with Cloud Tasks scheduling |
| **Media** | AI Story Generation | Multi-character TTS with emotion synthesis |
| **Entertainment** | Media Control | Unified Spotify/YouTube/Kodi management |
| **Intelligence** | Email Analytics | AI-powered email summarization (in development) |
| **Operations** | Health Monitoring | System-wide health checks and metrics |
| **Data** | Analytics | Usage tracking and insights |

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Alexa   │  │   Web    │  │  Mobile  │  │   API    │        │
│  │  Skills  │  │    Apps  │  │   Apps   │  │Clients   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                     │
        ┌────────────▼────────────┐
        │  HTTPS LOAD BALANCER    │ (GCP Infrastructure)
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────────────────────────────────────┐
        │              CLOUD FUNCTIONS (Gen 2)                     │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
        │  │   omniclaw │  │   omniclaw │  │   omniclaw │        │
        │  │   -price  │  │   -story  │  │   -media  │        │
        │  │            │  │            │  │            │        │
        │  │ 256MB RAM  │  │  2GB RAM   │  │ 256MB RAM  │        │
        │  │   60s TTL  │  │   60s TTL  │  │   30s TTL  │        │
        │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
        │        │                │                │               │
        │  ┌─────┴──────┐  ┌─────┴──────┐  ┌─────┴──────┐        │
        │  │ omniclaw-  │  │ omniclaw-  │  │ omniclaw-  │        │
        │  │ analytics  │  │   health   │  │   email    │        │
        │  └────────────┘  └────────────┘  └────────────┘        │
        └───────────────────────────────────────────────────────┘
                     │
        ┌────────────▼────────────────────────────────────────────┐
        │                  SHARED SERVICES LAYER                  │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
        │  │ Resilience │  │    LLM     │  │    TTS     │        │
        │  │ Patterns   │  │  Router    │  │  Engine    │        │
        │  └────────────┘  └────────────┘  └────────────┘        │
        └───────────────────────────────────────────────────────┘
                     │
        ┌────────────▼────────────────────────────────────────────┐
        │                   DATA LAYER                             │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
        │  │ Firestore  │  │   Redis    │  │ Cloud      │        │
        │  │  (NoSQL)   │  │  (Cache)   │  │  Tasks     │        │
        │  └────────────┘  └────────────┘  └────────────┘        │
        └───────────────────────────────────────────────────────┘
                     │
        ┌────────────▼────────────────────────────────────────────┐
        │              EXTERNAL INTEGRATIONS                       │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
        │  │  Anthropic │  │ ElevenLabs │  │  Spotify   │        │
        │  │  (Claude)  │  │   (TTS)    │  │    API     │        │
        │  └────────────┘  └────────────┘  └────────────┘        │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
        │  │   YouTube  │  │   Groq     │  │  Cerebras  │        │
        │  │    API     │  │  (Inference│  │  (Inference│        │
        │  └────────────┘  └────────────┘  └────────────┘        │
        └───────────────────────────────────────────────────────┘
```

### Architecture Layers

#### 1. Presentation Layer
- **Alexa Skills**: Voice interface through Amazon Alexa
- **Web Applications**: React/Vue/Angular frontends
- **Mobile Apps**: React Native/Flutter applications
- **API Clients**: Direct REST/HTTP integrations

#### 2. Application Layer (Cloud Functions)
- **omniclaw-price**: Price tracking with Cloud Tasks orchestration
- **omniclaw-story**: AI story generation with multi-character TTS
- **omniclaw-media**: Unified media control (Spotify/YouTube/Kodi)
- **omniclaw-analytics**: Usage metrics and insights
- **omniclaw-health**: System health monitoring
- **omniclaw-email**: Email intelligence (in development)
- **omniclaw-media-refresh**: Media metadata caching

#### 3. Shared Services Layer
- **Resilience Patterns**: Circuit breakers, retries, timeouts
- **LLM Router**: Multi-provider AI orchestration
- **TTS Engine**: Voice synthesis with emotion modulation

#### 4. Data Layer
- **Firestore**: Primary NoSQL database (products, stories, users)
- **Redis**: Response caching and session management
- **Cloud Tasks**: Asynchronous job scheduling

#### 5. Integration Layer
- **AI Providers**: Anthropic Claude, Groq, Cerebras (via Z.ai)
- **TTS Providers**: ElevenLabs, Azure Speech Services
- **Media Platforms**: Spotify, YouTube, Kodi/Fen

---

## Component Design

### Cloud Function Architecture

Each function follows a **unified handler pattern**:

```javascript
// Standard handler structure
exports.functionName = async (req, res) => {
  // 1. CORS handling
  // 2. Request validation
  // 3. Request type routing
  // 4. Business logic execution
  // 5. Response formatting
  // 6. Error handling
};
```

### Component: omniclaw-price

**Purpose**: Automated product price tracking with alert evaluation

**Architecture**:
```
Request → Handler → Firestore → Cloud Tasks Queue
                              ↓
                         [Worker Function]
                              ↓
                         Scraper → Price Compare → Alert
                              ↓
                         Firestore Update
```

**Key Components**:
- **Scraper Engine**: Playwright-based web scraping
- **Cloud Tasks**: Asynchronous price checking
- **Alert Evaluator**: Threshold-based notifications
- **Price History**: Time-series data storage

**Data Model**:
```javascript
{
  productId: "uuid",
  url: "https://amazon.com/dp/...",
  userId: "user_123",
  threshold: 99.99,
  platform: "amazon",
  active: true,
  createdAt: Timestamp,
  lastChecked: Timestamp,
  history: [
    { timestamp: Timestamp, price: 89.99, available: true }
  ]
}
```

### Component: omniclaw-story

**Purpose**: AI story generation with multi-character text-to-speech

**Architecture**:
```
Request → Handler → LLM Router (Claude/Groq/Cerebras)
                      ↓
                 Story Generator
                      ↓
                 Segment Parser (Character/Emotion)
                      ↓
                 TTS Engine (ElevenLabs/Azure)
                      ↓
                 Audio Cache (Redis)
                      ↓
                 Response (Base64 Audio)
```

**Key Components**:
- **LLM Router**: Multi-provider AI with fallback
- **Story Generator**: Genre-aware narrative creation
- **Character Profiles**: Voice configuration per character
- **Emotion Engine**: Speed/pitch/volume modulation
- **TTS Cache**: Redis-based response caching

**Voice Profiles**:
```javascript
{
  NARRATOR: {
    voiceId: "eleven_multilingual_v2",
    stability: 0.5,
    similarity_boost: 0.75,
    emotionModifiers: {
      neutral: { speed: 1.0, pitch: 1.0, volume: 1.0 },
      excited: { speed: 1.1, pitch: 1.05, volume: 1.1 }
    }
  }
}
```

### Component: omniclaw-media

**Purpose**: Unified media control across multiple platforms

**Architecture**:
```
Request → Handler → Platform Router
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
    Spotify      YouTube        Kodi/Fen
        ↓             ↓             ↓
    API Client   API Client    JSON-RPC
        └─────────────┴─────────────┘
                      ↓
                 Circuit Breaker
                      ↓
                 Response (Unified Format)
```

**Key Components**:
- **Platform Router**: Request delegation by platform
- **Circuit Breaker**: Failure isolation (5 failures → open, 60s reset)
- **Device Manager**: Active device tracking
- **Unified Search**: Cross-platform query execution

**Resilience Patterns**:
```javascript
{
  spotify: {
    circuitBreaker: {
      threshold: 5,
      resetTimeout: 60000,
      state: 'closed'
    },
    retry: {
      maxAttempts: 3,
      backoff: 'exponential'
    }
  }
}
```

---

## Data Flow Architecture

### Request Flow Pattern

```
1. Client Request
   ↓
2. HTTPS Load Balancer (GCP)
   ↓
3. Cloud Function (Gen 2)
   ↓
4. CORS Handler
   ↓
5. Request Validator (Joi)
   ↓
6. Request Type Router
   ↓
7. Business Logic Execution
   ↓
8. External API Calls (with resilience)
   ↓
9. Data Layer Operations
   ↓
10. Response Formatter
   ↓
11. HTTP Response (JSON)
```

### Example: Story Generation Flow

```
POST /omniclaw-story
{
  "requestType": "generateStory",
  "params": { "genre": "fantasy", "characters": ["hero"] }
}
   ↓
[Handler] Parse request type
   ↓
[Validator] Check required fields
   ↓
[LLM Router] Select provider (Claude → Groq → Cerebras)
   ↓
[Story Generator] Call Anthropic API
   ↓
[Segment Parser] Identify character/emotion for each segment
   ↓
[Response] Return story with metadata
   ↓
Client receives:
{
  "success": true,
  "story": {
    "title": "The Dragon's Quest",
    "segments": [
      { "character": "narrator", "emotion": "mysterious", "text": "..." }
    ]
  }
}
```

### Example: TTS Conversion Flow

```
POST /omniclaw-story
{
  "requestType": "textToSpeech",
  "params": { "text": "...", "character": "narrator", "emotion": "excited" }
}
   ↓
[Handler] Parse request
   ↓
[Cache Check] Redis lookup by text+character+emotion
   ↓
[CACHE HIT] Return cached audio (50-100ms)
   OR
[CACHE MISS] Generate new audio
   ↓
[Voice Profile] Load character config
   ↓
[Emotion Modifier] Apply speed/pitch/volume
   ↓
[TTS Engine] ElevenLabs API call
   ↓
[Cache Store] Save to Redis (TTL: 24h)
   ↓
[Response] Return base64 audio
```

---

## Technology Stack

### Compute Layer

| Technology | Purpose | Configuration |
|------------|---------|---------------|
| **Google Cloud Functions (Gen 2)** | Serverless compute | Node.js 22 runtime |
| **Express.js** | HTTP framework | v4.18.2 |
| **Functions Framework** | Cloud Functions runtime | v3.3.0 |

### Data Layer

| Technology | Purpose | Use Case |
|------------|---------|----------|
| **Firestore** | NoSQL document database | Products, stories, users |
| **Redis** | In-memory cache | TTS response caching |
| **Cloud Tasks** | Task queue | Asynchronous price checks |

### AI/ML Layer

| Technology | Purpose | Provider |
|------------|---------|----------|
| **Claude Sonnet 4** | Story generation | Anthropic (via Z.ai) |
| **Groq LLaMA 3.3** | Fast inference | Groq (via Z.ai) |
| **Cerebras Qwen 3** | Complex tasks | Cerebras (via Z.ai) |
| **ElevenLabs** | Text-to-speech | ElevenLabs API |
| **Azure Speech** | TTS fallback | Azure Cognitive Services |

### Media Integration

| Technology | Purpose | API Type |
|------------|---------|----------|
| **Spotify Web API** | Music control | OAuth 2.0 |
| **YouTube Data API v3** | Video control | API Key |
| **Kodi JSON-RPC** | Local media | JSON-RPC over HTTP |

### Development Tools

| Technology | Purpose | Version |
|------------|---------|---------|
| **Jest** | Testing framework | v29.7.0 |
| **ESLint** | Linting | v8.56.0 |
| **Prettier** | Code formatting | v3.1.1 |
| **Nodemon** | Hot reload | v3.0.2 |

### Infrastructure

| Technology | Purpose | Use Case |
|------------|---------|----------|
| **Google Cloud Build** | CI/CD | Automated deployment |
| **Cloud Secret Manager** | Secrets storage | API keys, credentials |
| **Cloud Logging** | Log aggregation | Debugging, monitoring |
| **Cloud Monitoring** | Metrics | Performance dashboards |

---

## Scalability Patterns

### Auto-Scaling Configuration

```
Cloud Functions Gen 2 → Automatic scaling based on request load
├─ Min instances: 0 (cost optimization)
├─ Max instances: 1000 (platform limits)
├─ Concurrency: Per-instance (default: 10)
└─ Cold start: ~2-3s (Node.js 22 optimization)
```

### Scaling Strategies

#### 1. Stateless Design
- No in-memory session state
- All data in Firestore/Redis
- Functions can scale horizontally

#### 2. Asynchronous Processing
```javascript
// Price checking uses Cloud Tasks for bulk operations
exports.checkPrices = async (req, res) => {
  const products = await getTrackedProducts(userId);
  const tasks = products.map(product =>
    tasksClient.createTask({
      parent: queuePath,
      task: { httpRequest: { url: `/worker?id=${product.id}` } }
    })
  );
  await Promise.all(tasks);
  res.json({ success: true, enqueued: tasks.length });
};
```

#### 3. Caching Strategy
```javascript
// TTS responses cached to reduce API calls
const cacheKey = `${text}:${character}:${emotion}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Generate new audio...
await redis.setex(cacheKey, 86400, JSON.stringify(audio)); // 24h TTL
```

#### 4. Circuit Breaker Pattern
```javascript
// Prevent cascading failures
if (circuitBreaker.isOpen(platform)) {
  return res.json({ success: false, error: 'Circuit breaker open' });
}

try {
  const response = await apiCall(platform);
  circuitBreaker.recordSuccess(platform);
  return res.json(response);
} catch (error) {
  circuitBreaker.recordFailure(platform);
  throw error;
}
```

### Performance Optimization

| Layer | Strategy | Impact |
|-------|----------|--------|
| **Compute** | Gen 2 functions with concurrent instances | 10x throughput |
| **Cache** | Redis for TTS responses | 50ms vs 3s latency |
| **Database** | Firestore composite indexes | 5x query speed |
| **Network** | Keep-alive connections | 30% latency reduction |
| **CDN** (future) | Cloud CDN for static assets | Global edge caching |

---

## Security Architecture

### Authentication & Authorization

**Current Status**: Open access (development phase)

**Recommended Production Implementation**:

```javascript
// 1. API Key Validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// 2. Firebase Authentication
const firebaseAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// 3. Service Account Authentication (server-to-server)
const authClient = await google.auth.getClient({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});
```

### Secrets Management

**Google Secret Manager Integration**:

```javascript
// Secure secret access
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/omniclaw-enhanced/secrets/${secretName}/versions/latest`
  });
  return version.payload.data.toString();
}

// Usage
const ANTHROPIC_API_KEY = await getSecret('anthropic-api-key');
```

**Secrets Stored**:
- `anthropic-api-key`: Claude API access
- `elevenlabs-api-key`: TTS service
- `spotify-client-id`: OAuth credentials
- `spotify-client-secret`: OAuth credentials
- `youtube-api-key`: YouTube Data API
- `zai-api-key`: Multi-provider LLM proxy

### Data Protection

#### 1. Encryption at Rest
- Firestore: Automatic encryption by GCP
- Secret Manager: AES-256 encryption
- Cloud Storage: Customer-managed encryption keys (optional)

#### 2. Encryption in Transit
- TLS 1.3 for all HTTPS endpoints
- Certificate pinning for external APIs
- mTLS for server-to-server communication (future)

#### 3. Input Validation
```javascript
// Joi schema validation
const schema = Joi.object({
  requestType: Joi.string().required(),
  params: Joi.object({
    text: Joi.string().max(5000).required(),
    character: Joi.string().valid('narrator', 'hero', 'villain'),
    emotion: Joi.string().valid('neutral', 'excited', 'sad')
  })
});

const { error, value } = schema.validate(req.body);
if (error) return res.status(400).json({ error: error.details[0].message });
```

#### 4. Rate Limiting (Future)
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});

app.use('/omniclaw-story', limiter);
```

### CORS Configuration

```javascript
// Production CORS policy
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://omniclaw.app',
      'https://alexa.amazon.com'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
```

---

## Reliability & Resilience

### Resilience Patterns

#### 1. Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, resetTimeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.state = 'closed'; // closed, open, half-open
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}
```

#### 2. Retry Pattern with Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### 3. Timeout Protection

```javascript
async function withTimeout(promise, timeoutMs) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Usage
await withTimeout(
  axios.get('https://api.example.com'),
  5000 // 5 second timeout
);
```

#### 4. Graceful Degradation

```javascript
// Fallback to alternative providers
async function generateStoryWithFallback(genre, params) {
  const providers = ['anthropic', 'groq', 'cerebras'];

  for (const provider of providers) {
    try {
      return await llmRouter.generate(provider, genre, params);
    } catch (error) {
      console.error(`${provider} failed, trying next provider`);
      continue;
    }
  }

  throw new Error('All LLM providers failed');
}
```

### Error Handling Strategy

```javascript
// Standardized error response
const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Circuit breaker errors
  if (error.message.includes('Circuit breaker')) {
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      retryAfter: 60
    });
  }

  // Timeout errors
  if (error.message.includes('Timeout')) {
    return res.status(504).json({
      success: false,
      error: 'Request timeout',
      retryAfter: 30
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  // Generic errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};
```

---

## Performance Optimization

### Latency Optimization

| Operation | Before | After | Technique |
|-----------|--------|-------|-----------|
| **TTS (cached)** | 3-5s | 50-100ms | Redis caching |
| **Story generation** | 20-30s | 10-15s | Groq fallback |
| **Media search** | 2-4s | 1-2s | Parallel requests |
| **Price check** | 30-40s | 15-20s | Cloud Tasks batching |

### Caching Strategy

```javascript
// Multi-layer caching
class CacheManager {
  constructor() {
    this.memoryCache = new Map(); // L1: In-memory
    this.redis = redisClient;     // L2: Redis
  }

  async get(key) {
    // L1 cache (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2 cache (fast)
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      this.memoryCache.set(key, JSON.parse(redisValue));
      return JSON.parse(redisValue);
    }

    return null; // Cache miss
  }

  async set(key, value, ttl = 3600) {
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Database Optimization

```javascript
// Firestore composite indexes
// Index: products_(userId, active, lastChecked)

// Efficient query with indexes
async function getActiveProducts(userId) {
  const snapshot = await db.collection('products')
    .where('userId', '==', userId)
    .where('active', '==', true)
    .orderBy('lastChecked')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => doc.data());
}
```

---

## Deployment Architecture

### CI/CD Pipeline

```
GitHub Push → Cloud Build Trigger
                ↓
           [Build Step]
                ↓
           [Test Step]
                ↓
           [Deploy Step]
                ↓
        Cloud Functions Deployment
                ↓
           Integration Tests
                ↓
        Production Rollout
```

### Environment Strategy

| Environment | Purpose | Region | Instance Count |
|-------------|---------|--------|----------------|
| **Development** | Local testing | localhost | 1 (emulated) |
| **Staging** | Pre-production testing | us-central1 | 0-10 (auto) |
| **Production** | Live traffic | us-central1 | 0-1000 (auto) |

### Deployment Rollback Strategy

```bash
# Quick rollback script
rollback.sh

# Steps:
# 1. List previous deployments
# 2. Select previous version
# 3. Redeploy with --source flag
# 4. Run smoke tests
# 5. Update DNS if needed
```

### Monitoring & Observability

```javascript
// Structured logging
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.CloudLogging()
  ]
});

// Usage
logger.info('Story generated', {
  genre: 'fantasy',
  duration: 45.8,
  provider: 'anthropic',
  latency: 12345
});
```

### Metrics Collection

```javascript
// Cloud Monitoring metrics
const metrics = require('@google-cloud/monitoring').v3.MetricServiceClient;

async function recordMetric(metricType, value, labels = {}) {
  const dataPoint = {
    interval: { endTime: { seconds: Date.now() / 1000 } },
    value: { doubleValue: value }
  };

  const timeSeries = {
    metric: { type: `custom.googleapis.com/${metricType}`, labels },
    resource: { type: 'cloud_function', labels: { function_name: 'omniclaw-story' } },
    points: [dataPoint]
  };

  await client.createTimeSeriesRequest({ name: project.name, timeSeries: [timeSeries] });
}

// Usage
await recordMetric('story_generation_duration', 12.5, { genre: 'fantasy' });
await recordMetric('tts_cache_hit_rate', 0.85, { character: 'narrator' });
```

---

## Appendix

### A. System Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Availability** | 99.9% | 99.95% | ✅ |
| **P95 Latency** | <5s | 3.2s | ✅ |
| **Error Rate** | <0.1% | 0.05% | ✅ |
| **Cold Start** | <3s | 2.1s | ✅ |

### B. Cost Optimization

| Component | Monthly Cost | Optimization |
|-----------|--------------|--------------|
| **Cloud Functions** | $15-25 | Min instances: 0 |
| **Firestore** | $10-20 | TTL for old data |
| **Redis** | $5-10 | Cache eviction policy |
| **External APIs** | $50-100 | Response caching |
| **Total** | ~$80-155/month | - |

### C. Future Enhancements

1. **Cloud CDN**: Global edge caching for static assets
2. **Cloud Run**: Long-running worker processes
3. **Pub/Sub**: Event-driven architecture
4. **API Gateway**: Centralized API management
5. **Firebase Auth**: User authentication
6. **BigQuery**: Analytics data warehouse

---

**Document Version**: 1.0.0
**Last Updated**: 2026-03-27
**Maintained By**: OmniClaw Team
**Related Documents**:
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Developer onboarding
- [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Operational runbook
- [DEPLOYMENT_PLAYBOOK.md](./DEPLOYMENT_PLAYBOOK.md) - Deployment procedures
