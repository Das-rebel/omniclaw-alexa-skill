# OmniClaw Enhanced - Developer Guide

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Target Audience**: Software Engineers, DevOps Engineers
**Reading Time**: 45 minutes

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Testing Procedures](#testing-procedures)
7. [Code Organization](#code-organization)
8. [Common Tasks](#common-tasks)
9. [Debugging Tips](#debugging-tips)
10. [Contributing Guidelines](#contributing-guidelines)
11. [Best Practices](#best-practices)
12. [Performance Tuning](#performance-tuning)

---

## Introduction

Welcome to the OmniClaw Enhanced developer guide! This document provides comprehensive information for contributing to the project, setting up your development environment, and following best practices.

### What is OmniClaw Enhanced?

OmniClaw Enhanced is a **serverless microservices platform** built on Google Cloud Platform that provides:

- **Price Tracking**: Automated product monitoring with alert evaluation
- **AI Story Generation**: Multi-character text-to-speech with emotion synthesis
- **Media Control**: Unified management of Spotify, YouTube, and Kodi
- **Email Intelligence**: AI-powered email summarization (in development)

### Development Philosophy

- **Serverless-First**: Leverage managed services for scalability
- **API-First Design**: Unified request/response patterns
- **Resilience Patterns**: Circuit breakers, retries, graceful degradation
- **Test-Driven**: Comprehensive test coverage (unit, integration, E2E)
- **Documentation**: Code should be self-documenting with clear comments

---

## Prerequisites

### Required Software

#### 1. Node.js & npm
```bash
# Install Node.js 18+ (recommended: 20.x)
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

#### 2. Google Cloud CLI
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Initialize and authenticate
gcloud init
gcloud auth login

# Set default project
gcloud config set project omniclaw-enhanced
```

#### 3. Git
```bash
# Clone repository
git clone https://github.com/your-org/omniclaw-enhanced.git
cd omniclaw-enhanced
```

### Optional Tools

#### 1. Docker (for local Redis)
```bash
# Install Docker Desktop
docker --version
```

#### 2. Postman (for API testing)
```bash
# Download from https://www.postman.com/downloads/
```

#### 3. VS Code Extensions
```
- ESLint
- Prettier
- Jest Runner
- Cloud Functions
- Firebase
```

---

## Local Development Setup

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install all app dependencies
npm run install:all
```

### Step 2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.production.example .env.local

# Edit with your values
nano .env.local
```

**Required variables**:
```env
# Google Cloud
PROJECT_ID=omniclaw-enhanced
FIRESTORE_PROJECT=omniclaw-enhanced

# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
CEREBRAS_API_KEY=your_cerebras_key

# TTS Providers
ELEVENLABS_API_KEY=your_elevenlabs_key
AZURE_SPEECH_KEY=your_azure_key

# Media Platforms
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
YOUTUBE_API_KEY=your_youtube_key

# Local Development
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Step 3: Start Local Services

```bash
# Start Redis (using Docker)
docker run -d -p 6379:6379 redis:alpine

# Verify Redis is running
redis-cli ping  # Should return PONG
```

### Step 4: Run Firestore Emulator

```bash
# Install Firestore emulator
gcloud components install cloud-firestore-emulator

# Start emulator
gcloud emulators firestore start --host-port=localhost:8080

# In another terminal, set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

### Step 5: Test Local Setup

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run smoke tests
npm run test:smoke:staging
```

---

## Project Structure

```
omniclaw-enhanced/
├── apps/                      # Application modules
│   ├── price-tracking/        # Price tracking service
│   ├── story-narrator/        # Story generation service
│   ├── media-streaming/       # Media control service
│   ├── email-intelligence/    # Email analysis service
│   ├── analytics/             # Analytics service
│   └── monitoring/            # Health monitoring
├── shared/                    # Shared utilities
│   ├── clients/               # External API clients
│   ├── resilience/            # Resilience patterns
│   ├── llm/                   # LLM router
│   ├── tts/                   # TTS engine
│   └── utils/                 # Common utilities
├── infrastructure/            # Cloud infrastructure
│   └── cloud-functions/       # Function handlers
├── tests/                     # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   ├── performance/           # Performance tests
│   └── smoke/                 # Smoke tests
├── deploy/                    # Deployment configurations
│   └── functions/             # Individual function specs
├── scripts/                   # Automation scripts
├── docs/                      # Documentation
├── monitoring/                # Monitoring configs
└── examples/                  # Usage examples
```

### Module Structure

Each app module follows this structure:

```
apps/price-tracking/
├── src/
│   ├── handlers/              # Request handlers
│   ├── services/              # Business logic
│   ├── models/                # Data models
│   ├── validators/            # Input validation
│   └── utils/                 # Module utilities
├── tests/                     # Module tests
├── package.json               # Module dependencies
└── README.md                  # Module documentation
```

---

## Development Workflow

### 1. Branch Strategy

```bash
# Main branches
main          # Production code
staging       # Pre-production testing

# Feature branches
feature/price-alerts          # New feature
fix/media-timeout             # Bug fix
refactor/tts-engine           # Refactoring
docs/api-documentation        # Documentation
```

### 2. Creating a Feature Branch

```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "feat: add price alert notifications"

# Push to remote
git push origin feature/my-new-feature
```

### 3. Development Cycle

```bash
# 1. Write tests first (TDD)
npm run test:watch

# 2. Implement feature
# ... code changes ...

# 3. Run tests
npm run test:unit
npm run test:integration

# 4. Lint code
npm run lint

# 5. Format code
npm run format

# 6. Run full test suite
npm run test:all

# 7. Commit changes
git commit -m "feat: implementation complete"

# 8. Push and create PR
git push origin feature/my-new-feature
```

### 4. Code Review Process

```bash
# Create pull request on GitHub
# Request review from team members

# Address review feedback
git commit -m "fix: address review comments"

# Squash commits if needed
git rebase -i HEAD~3

# Update PR
git push origin feature/my-new-feature --force
```

### 5. Merging to Main

```bash
# After PR approval
git checkout main
git pull origin main
git merge feature/my-new-feature --no-ff
git push origin main

# Delete feature branch
git branch -d feature/my-new-feature
git push origin --delete feature/my-new-feature
```

---

## Testing Procedures

### Test Structure

```javascript
// Example test structure
describe('Price Tracking Service', () => {
  describe('addProduct', () => {
    it('should add product with valid URL', async () => {
      const result = await priceService.addProduct(validProduct);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', async () => {
      await expect(
        priceService.addProduct({ url: 'invalid-url' })
      ).rejects.toThrow('Invalid URL format');
    });

    it('should enqueue Cloud Task', async () => {
      const spy = jest.spyOn(tasksClient, 'createTask');
      await priceService.addProduct(validProduct);
      expect(spy).toHaveBeenCalled();
    });
  });
});
```

### Running Tests

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# All tests
npm run test:all

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Unit Tests

```javascript
// __tests__/unit/priceService.test.js
const priceService = require('../../apps/price-tracking/src/services/priceService');

describe('Price Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('validateProductURL', () => {
    it('should validate Amazon URLs', () => {
      const url = 'https://amazon.com/dp/B08N5WRWNW';
      expect(priceService.validateProductURL(url)).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const url = 'not-a-url';
      expect(priceService.validateProductURL(url)).toBe(false);
    });
  });

  describe('comparePrice', () => {
    it('should trigger alert when price drops below threshold', () => {
      const product = { threshold: 100, currentPrice: 89.99 };
      const alert = priceService.comparePrice(product);
      expect(alert.trigger).toBe(true);
      expect(alert.savings).toBe(10.01);
    });
  });
});
```

### Writing Integration Tests

```javascript
// __tests__/integration/storyAPI.test.js
const request = require('supertest');
const functionsFramework = require('@google-cloud/functions-framework/testing');

describe('Story API Integration Tests', () => {
  let server;

  beforeAll(() => {
    // Load function for testing
    functionsFramework.http('omniclaw-story', require('../apps/story-narrator/src/index'));
    server = functionsFramework.getServer('omniclaw-story');
  });

  it('should generate story successfully', async () => {
    const response = await request(server)
      .post('/')
      .send({
        requestType: 'generateStory',
        params: { genre: 'fantasy', duration: 'short' }
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.story).toBeDefined();
    expect(response.body.story.segments).toBeInstanceOf(Array);
  });

  it('should handle TTS request', async () => {
    const response = await request(server)
      .post('/')
      .send({
        requestType: 'textToSpeech',
        params: {
          text: 'Test narration',
          character: 'narrator',
          emotion: 'neutral'
        }
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.audio).toBeDefined();
    expect(response.body.cached).toBeDefined();
  });
});
```

### Writing E2E Tests

```javascript
// __tests__/e2e/userFlows.test.js
describe('End-to-End User Flows', () => {
  it('should complete price tracking workflow', async () => {
    // 1. Add product
    const addResponse = await axios.post(PRICE_URL, {
      requestType: 'addProduct',
      userId: 'test-user',
      params: { url: 'https://amazon.com/dp/B08N5WRWNW' }
    });
    expect(addResponse.data.success).toBe(true);

    const productId = addResponse.data.productId;

    // 2. Get tracked products
    const getResponse = await axios.post(PRICE_URL, {
      requestType: 'getTracked',
      userId: 'test-user'
    });
    expect(getResponse.data.products).toHaveLength(1);

    // 3. Check prices
    await axios.post(PRICE_URL, {
      requestType: 'checkPrices',
      userId: 'test-user'
    });

    // 4. Get price history
    const historyResponse = await axios.post(PRICE_URL, {
      requestType: 'getPriceHistory',
      params: { productId }
    });
    expect(historyResponse.data.history).toBeDefined();
  });

  it('should complete story generation workflow', async () => {
    // 1. Generate story
    const storyResponse = await axios.post(STORY_URL, {
      requestType: 'generateStory',
      params: { genre: 'fantasy', duration: 'short' }
    });
    expect(storyResponse.data.story.segments.length).toBeGreaterThan(0);

    // 2. Convert segments to audio
    const segment = storyResponse.data.story.segments[0];
    const ttsResponse = await axios.post(STORY_URL, {
      requestType: 'textToSpeech',
      params: {
        text: segment.text,
        character: segment.character,
        emotion: segment.emotion
      }
    });
    expect(ttsResponse.data.audio).toBeDefined();

    // 3. Verify audio is valid base64
    const audioBuffer = Buffer.from(ttsResponse.data.audio, 'base64');
    expect(audioBuffer.length).toBeGreaterThan(0);
  });
});
```

### Performance Testing

```javascript
// __tests__/performance/load.test.js
const { check } = require('k6');
const http = require('k6/http');

export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '20s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
};

export default function () {
  const response = http.post(
    'https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story',
    JSON.stringify({
      requestType: 'textToSpeech',
      params: { text: 'Performance test', character: 'narrator' }
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });
}
```

---

## Code Organization

### Handler Pattern

All Cloud Functions follow a consistent handler pattern:

```javascript
// apps/story-narrator/src/index.js
const { storyHandler } = require('./handlers/storyHandler');
const { errorHandler } = require('../../shared/resilience/errorHandler');

exports.omniclawStory = async (req, res) => {
  try {
    // CORS handling
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');

    // Validate request
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Route to handler
    return await storyHandler(req, res);

  } catch (error) {
    return errorHandler(error, req, res);
  }
};
```

### Service Layer

```javascript
// apps/story-narrator/src/services/storyService.js
const llmRouter = require('../../shared/llm/llmRouter');
const { validateStoryParams } = require('../validators/storyValidator');

class StoryService {
  async generateStory(params) {
    // Validate input
    const { error, value } = validateStoryParams(params);
    if (error) throw new Error(error.details[0].message);

    // Generate story using LLM
    const story = await llmRouter.generate('story', value);

    // Parse into segments
    const segments = this.parseStorySegments(story);

    return {
      title: this.generateTitle(value.genre),
      genre: value.genre,
      segments,
      totalDuration: segments.reduce((sum, s) => sum + s.duration, 0),
      wordCount: story.split(' ').length
    };
  }

  parseStorySegments(story) {
    // Parse story into character/emotion segments
    // Implementation...
  }

  generateTitle(genre) {
    const titles = {
      fantasy: 'The Magical Quest',
      'sci-fi': 'Starship Odyssey',
      mystery: 'The Hidden Clue'
    };
    return titles[genre] || 'A New Adventure';
  }
}

module.exports = new StoryService();
```

### Validator Pattern

```javascript
// apps/story-narrator/src/validators/storyValidator.js
const Joi = require('joi');

const generateStorySchema = Joi.object({
  genre: Joi.string()
    .valid('fantasy', 'sci-fi', 'mystery', 'horror', 'romance', 'adventure')
    .default('fantasy'),
  characters: Joi.array()
    .items(Joi.string().valid('narrator', 'hero', 'villain', 'sidekick', 'wise_old_man'))
    .default(['hero']),
  duration: Joi.string().valid('short', 'long').default('short')
});

const textToSpeechSchema = Joi.object({
  text: Joi.string().max(5000).required(),
  character: Joi.string()
    .valid('narrator', 'hero', 'villain', 'sidekick', 'wise_old_man', 'mystical_creature')
    .default('narrator'),
  emotion: Joi.string()
    .valid('neutral', 'excited', 'sad', 'mysterious', 'determined')
    .default('neutral')
});

function validateStoryParams(params) {
  const schema = Joi.object({
    requestType: Joi.string().required(),
    params: Joi.object().when('requestType', {
      is: 'generateStory',
      then: generateStorySchema,
      otherwise: textToSpeechSchema
    })
  });

  return schema.validate(params);
}

module.exports = { validateStoryParams };
```

---

## Common Tasks

### Adding a New Request Type

```javascript
// 1. Update validator
const newRequestSchema = Joi.object({
  field1: Joi.string().required(),
  field2: Joi.number().optional()
});

// 2. Add handler method
async handleNewRequest(params) {
  const { error, value } = newRequestSchema.validate(params);
  if (error) throw new Error(error.details[0].message);

  // Business logic
  const result = await processData(value);

  return { success: true, data: result };
}

// 3. Route in main handler
if (requestType === 'newRequest') {
  return await handleNewRequest(params);
}
```

### Adding External API Integration

```javascript
// shared/clients/newApiClient.js
const axios = require('axios');
const { retryWithBackoff } = require('../resilience/retry');

class NewApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.example.com';
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  async getData(params) {
    return this.circuitBreaker.execute(async () => {
      return retryWithBackoff(async () => {
        const response = await axios.get(`${this.baseURL}/data`, {
          params,
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          timeout: 5000
        });
        return response.data;
      });
    });
  }
}

module.exports = NewApiClient;
```

### Running Local Emulator

```bash
# Start all emulators
gcloud emulators start

# Start specific emulator
gcloud emulators firestore start --host-port=localhost:8080
gcloud emulators pubsub start --host-port=localhost:8085

# Set environment variables
export FIRESTORE_EMULATOR_HOST=localhost:8080
export PUBSUB_EMULATOR_HOST=localhost:8085

# Run tests against emulators
npm run test:integration
```

### Debugging Cloud Functions

```javascript
// Use structured logging
const logger = require('../../shared/utils/logger');

logger.info('Processing request', {
  requestId: req.body.requestId,
  userId: req.body.userId
});

logger.debug('External API response', {
  provider: 'anthropic',
  latency: response.timings.duration,
  status: response.status
});

logger.error('API call failed', {
  provider: 'spotify',
  error: error.message,
  stack: error.stack
});

// View logs in Cloud Console
gcloud functions logs read omniclaw-story --limit 50 --region=us-central1
```

---

## Debugging Tips

### 1. Local Debugging with VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Story Function",
      "program": "${workspaceFolder}/node_modules/.bin/functions-framework",
      "args": [
        "--target=omniclawStory",
        "--signature-type=http",
        "--port=8080"
      ],
      "cwd": "${workspaceFolder}/apps/story-narrator"
    }
  ]
}
```

### 2. Remote Debugging

```bash
# View real-time logs
gcloud functions logs read omniclaw-story --tail --region=us-central1

# View specific log level
gcloud functions logs read omniclaw-story --filter="severity>=ERROR" --region=us-central1

# Export logs for analysis
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=omniclaw-story" --freshness=1h > logs.txt
```

### 3. Common Issues & Solutions

#### Issue: "Circuit breaker open"
```javascript
// Solution: Wait 60s or reset manually
circuitBreaker.reset();
```

#### Issue: "Timeout" errors
```javascript
// Solution: Increase timeout or optimize code
const response = await withTimeout(
  apiCall(),
  10000 // 10 seconds
);
```

#### Issue: "Out of memory"
```javascript
// Solution: Process data in chunks
async function processLargeDataset(items) {
  const chunks = chunk(items, 100);
  for (const chunk of chunks) {
    await processChunk(chunk);
  }
}
```

#### Issue: CORS errors
```javascript
// Solution: Ensure CORS headers are set
res.set('Access-Control-Allow-Origin', '*');
res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

### 4. Performance Profiling

```bash
# Run performance tests
npm run test:performance

# Profile memory usage
node --inspect app.js

# Generate flame graph
0x --log-level=vmm app.js
```

---

## Contributing Guidelines

### Code Style

We use **ESLint** and **Prettier** for consistent code style:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Commit Message Format

Follow **Conventional Commits** specification:

```
feat: add price alert notifications
fix: resolve timeout issues in media control
docs: update API documentation
test: add integration tests for story generation
refactor: optimize TTS caching strategy
chore: update dependencies
perf: improve cold start performance
ci: add GitHub Actions workflow
```

### Pull Request Guidelines

1. **Title**: Use conventional commit format
2. **Description**: Explain WHY and WHAT, not HOW
3. **Testing**: Include test results
4. **Documentation**: Update relevant docs
5. **Review**: Request at least one review

Example PR description:

```markdown
## Summary
Implements price alert notifications via email when products drop below threshold.

## Changes
- Add email notification service
- Integrate with SendGrid API
- Add notification preferences in Firestore
- Update API documentation

## Testing
- [x] Unit tests added
- [x] Integration tests pass
- [x] Manual testing completed

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Documentation updated
- [x] No new warnings generated
```

---

## Best Practices

### 1. Error Handling

```javascript
// ✅ Good: Specific error handling
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limit error
    return { success: false, error: 'Rate limit exceeded', retryAfter: 60 };
  } else if (error.code === 'ECONNREFUSED') {
    // Connection error
    return { success: false, error: 'Service unavailable' };
  }
  throw error;
}

// ❌ Bad: Generic error handling
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: 'Something went wrong' };
}
```

### 2. Async/Await Usage

```javascript
// ✅ Good: Sequential async operations
async function processItems(items) {
  for (const item of items) {
    await processItem(item);
  }
}

// ✅ Good: Parallel async operations
async function processItems(items) {
  await Promise.all(items.map(item => processItem(item)));
}

// ❌ Bad: Mixing callbacks with promises
function processItems(items, callback) {
  items.forEach(item => {
    processItem(item).then(result => callback(result));
  });
}
```

### 3. Environment Variables

```javascript
// ✅ Good: Validate environment variables
const requiredEnvVars = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY'];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// ❌ Bad: Assume variables exist
const apiKey = process.env.API_KEY;
```

### 4. Logging

```javascript
// ✅ Good: Structured logging
logger.info('Story generated successfully', {
  genre: 'fantasy',
  duration: 45.8,
  wordCount: 512,
  provider: 'anthropic',
  latency: 12345
});

// ❌ Bad: Unstructured logging
console.log('Story generated: fantasy, 45.8s, 512 words, using anthropic');
```

### 5. Input Validation

```javascript
// ✅ Good: Validate all inputs
const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ success: false, error: error.details[0].message });
}

// ❌ Bad: Assume inputs are valid
const url = req.body.url;
await scrapeProduct(url);
```

---

## Performance Tuning

### 1. Cold Start Optimization

```javascript
// ✅ Good: Lazy load heavy dependencies
let playwright;
async function getPlaywright() {
  if (!playwright) {
    playwright = await require('playwright');
  }
  return playwright;
}

// ❌ Bad: Load all dependencies at top
const playwright = require('playwright');
const heavyLibrary = require('heavy-library');
const anotherLibrary = require('another-library');
```

### 2. Memory Management

```javascript
// ✅ Good: Process data in chunks
async function processLargeFile(file) {
  const stream = fs.createReadStream(file);
  const rl = readline.createInterface({ input: stream });

  for await (const line of rl) {
    await processLine(line);
  }
}

// ❌ Bad: Load entire file into memory
async function processLargeFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach(line => processLine(line));
}
```

### 3. Caching Strategy

```javascript
// ✅ Good: Multi-layer caching
async function getCachedData(key) {
  // L1: In-memory cache (fastest)
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // L2: Redis cache (fast)
  const redisData = await redis.get(key);
  if (redisData) {
    memoryCache.set(key, JSON.parse(redisData));
    return JSON.parse(redisData);
  }

  // L3: Generate new data (slow)
  const data = await generateData(key);
  memoryCache.set(key, data);
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

---

## Appendix

### A. Useful Commands

```bash
# Development
npm run dev                    # Start development server
npm run test:watch             # Watch mode for tests
npm run lint:fix               # Fix linting issues

# Testing
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests
npm run test:performance       # Performance tests

# Deployment
npm run deploy:all             # Deploy all functions
npm run deploy:price           # Deploy price function
npm run deploy:story           # Deploy story function
npm run deploy:media           # Deploy media function

# Utilities
npm run backup                 # Backup data
npm run cleanup                # Clean up resources
npm run security               # Security audit
```

### B. Resources

- **Google Cloud Functions**: https://cloud.google.com/functions/docs
- **Firestore**: https://cloud.google.com/firestore/docs
- **Cloud Tasks**: https://cloud.google.com/tasks/docs
- **Jest**: https://jestjs.io/docs/getting-started
- **Node.js**: https://nodejs.org/docs

### C. Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask in team chat
4. Create new issue with details

---

**Document Version**: 1.0.0
**Last Updated**: 2026-03-27
**Maintained By**: OmniClaw Development Team
**Related Documents**:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Operational runbook
- [DEPLOYMENT_PLAYBOOK.md](./DEPLOYMENT_PLAYBOOK.md) - Deployment procedures
