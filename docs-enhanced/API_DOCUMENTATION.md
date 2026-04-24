# OmniClaw Enhanced - Cloud Functions API Documentation

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Base Region**: us-central1
**Project**: omniclaw-enhanced

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Function 1: omniclaw-price](#function-1-omniclaw-price)
- [Function 2: omniclaw-story](#function-2-omniclaw-story)
- [Function 3: omniclaw-media](#function-3-omniclaw-media)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)

---

## Overview

OmniClaw Enhanced provides three serverless Cloud Functions for price tracking, AI story generation with TTS, and unified media control across multiple platforms.

### Deployed Functions

| Function | URL | Purpose | Version |
|----------|-----|---------|---------|
| **omniclaw-price** | `https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price` | Product price tracking with Cloud Tasks | 3.0.0 |
| **omniclaw-story** | `https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story` | AI story generation with multi-character TTS | 2.0.0 |
| **omniclaw-media** | `https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media` | Unified media control (Spotify, YouTube, Kodi) | 2.0.0 |

---

## Authentication

Currently, all functions accept unauthenticated requests with CORS enabled for development purposes. For production deployment, implement proper authentication:

### CORS Configuration

All functions return these CORS headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Recommended Authentication (Future)

- Implement API key validation via `Authorization` header
- Add Firebase Authentication for user-specific endpoints
- Use Service Account authentication for server-to-server communication

---

## Rate Limiting

### Current Limits

Cloud Functions automatically scale, but consider these soft limits:

| Function | Recommended Rate | Timeout | Memory |
|----------|-----------------|---------|--------|
| omniclaw-price | 60 requests/minute | 60s | 256MB |
| omniclaw-story | 30 requests/minute | 60s | 2048MB |
| omniclaw-media | 100 requests/minute | 30s | 256MB |

### Best Practices

- Implement exponential backoff for retries
- Cache responses where appropriate
- Use Cloud Tasks for bulk operations (price tracking)

---

## Function 1: omniclaw-price

**Endpoint**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price`
**Version**: 3.0.0
**Purpose**: Monitor product prices with automated scraping and alert evaluation

### Endpoints

#### 1. Health Check

**Endpoint**: `GET /health` or `GET /`

Check function status and version.

**Request**:
```bash
curl -X GET \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health
```

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "service": "price-tracking",
  "version": "3.0.0",
  "timestamp": "2026-03-27T10:30:00.000Z"
}
```

---

#### 2. Add Product to Tracking

**Request Type**: `addProduct`

Add a product URL for price monitoring with automatic Cloud Tasks enqueueing.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "addProduct",
    "userId": "user_123",
    "params": {
      "url": "https://example.com/product/123",
      "threshold": 99.99,
      "platform": "amazon",
      "priority": "high"
    }
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"addProduct"` |
| `userId` | string | Yes | User identifier for ownership |
| `params.url` | string | Yes | Product URL to scrape |
| `params.threshold` | number | No | Price threshold for alerts (default: 0) |
| `params.platform` | string | No | E-commerce platform (default: "auto") |
| `params.priority` | string | No | Task priority: "low", "normal", "high" (default: "normal") |

**Response**:
```json
{
  "success": true,
  "message": "Product added to tracking",
  "productId": "abc123def456",
  "priority": "high"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid URL format",
  "timestamp": "2026-03-27T10:30:00.000Z"
}
```

---

#### 3. Get Tracked Products

**Request Type**: `getTracked`

Retrieve all active tracked products for a user.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "getTracked",
    "userId": "user_123"
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"getTracked"` |
| `userId` | string | Yes | User identifier |

**Response**:
```json
{
  "success": true,
  "products": [
    {
      "id": "abc123",
      "url": "https://example.com/product/123",
      "threshold": 99.99,
      "platform": "amazon",
      "priority": "high",
      "active": true,
      "createdAt": "2026-03-27T10:00:00.000Z",
      "lastChecked": "2026-03-27T12:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### 4. Get Price History

**Request Type**: `getPriceHistory`

Retrieve historical price data for a tracked product (last 100 entries).

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "getPriceHistory",
    "params": {
      "productId": "abc123def456"
    }
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"getPriceHistory"` |
| `params.productId` | string | Yes | Product ID from tracking |

**Response**:
```json
{
  "success": true,
  "productId": "abc123def456",
  "history": [
    {
      "timestamp": "2026-03-27T12:30:00.000Z",
      "price": 89.99,
      "currency": "USD",
      "available": true
    },
    {
      "timestamp": "2026-03-27T11:00:00.000Z",
      "price": 99.99,
      "currency": "USD",
      "available": true
    }
  ],
  "count": 2
}
```

---

#### 5. Delete Product

**Request Type**: `deleteProduct`

Soft-delete a product from tracking (sets `active: false`).

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "deleteProduct",
    "params": {
      "productId": "abc123def456"
    }
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"deleteProduct"` |
| `params.productId` | string | Yes | Product ID to deactivate |

**Response**:
```json
{
  "success": true,
  "message": "Product removed from tracking"
}
```

---

#### 6. Check Prices Immediately

**Request Type**: `checkPrices`

Trigger immediate price check for up to 10 active products (enqueues high-priority Cloud Tasks).

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "checkPrices",
    "userId": "user_123"
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"checkPrices"` |
| `userId` | string | Yes | User identifier |

**Response**:
```json
{
  "success": true,
  "message": "Enqueued 5 products for price check",
  "count": 5
}
```

---

## Function 2: omniclaw-story

**Endpoint**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story`
**Version**: 2.0.0
**Purpose**: AI story generation with multi-character text-to-speech synthesis

### Supported Characters

| Character | Description | Voice Style |
|-----------|-------------|-------------|
| `narrator` | Professional storytelling voice | Neutral, balanced |
| `hero` | Strong, confident protagonist | Higher pitch, confident |
| `villain` | Deep, menacing antagonist | Lower pitch, slow |
| `sidekick` | Cheerful, energetic companion | Higher pitch, fast |
| `wise_old_man` | Slow, deliberate mentor | Slow, low pitch |
| `mystical_creature` | Ethereal, otherworldly | High pitch, ethereal |

### Supported Emotions

- `neutral` - Default emotion
- `excited` - Fast, higher pitch, louder
- `sad` - Slow, lower pitch, quieter
- `mysterious` - Slow, slight pitch drop
- `determined` - Confident, strong
- `worried` - Slightly faster, lower volume
- `curious` - Faster, higher pitch
- `contemplative` - Very slow, quiet
- `urgent` - Faster, louder
- `gentle` - Slow, quiet
- `angry` - Fast, low pitch, loud
- `mocking` - Faster, slight pitch increase
- `sinister` - Very slow, low pitch, loud
- `powerful` - Fast, loud

### Endpoints

#### 1. Text-to-Speech (TTS)

**Request Type**: `textToSpeech`

Convert text to speech with character voice and emotion.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "textToSpeech",
    "params": {
      "text": "Once upon a time, in a land far away...",
      "character": "narrator",
      "emotion": "mysterious"
    }
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"textToSpeech"` |
| `params.text` | string | Yes | Text to convert to speech |
| `params.character` | string | No | Character voice (default: "narrator") |
| `params.emotion` | string | No | Emotion modifier (default: "neutral") |

**Response**:
```json
{
  "success": true,
  "audio": "base64_encoded_audio_data_here...",
  "cached": false,
  "character": "narrator",
  "emotion": "mysterious"
}
```

**Usage**:
```javascript
// Decode and play in browser
const response = await fetch('...');
const { audio } = await response.json();
const audioBuffer = atob(audio);
const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
const audioUrl = URL.createObjectURL(audioBlob);
new Audio(audioUrl).play();
```

---

#### 2. Generate Story

**Request Type**: `generateStory`

Generate an AI story using Claude with specified genre and characters.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "generateStory",
    "params": {
      "genre": "fantasy",
      "characters": ["hero", "wise_old_man", "villain"],
      "duration": "long"
    }
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"generateStory"` |
| `params.genre` | string | No | Story genre (default: "fantasy") |
| `params.characters` | array | No | Character list (default: ["hero"]) |
| `params.duration` | string | No | "short" (500 words) or "long" (1500 words) |

**Supported Genres**: fantasy, sci-fi, mystery, horror, romance, adventure

**Response**:
```json
{
  "success": true,
  "story": {
    "title": "The Dragon's Quest",
    "genre": "fantasy",
    "segments": [
      {
        "character": "narrator",
        "emotion": "mysterious",
        "text": "In the realm of Eldoria...",
        "duration": 5.2
      },
      {
        "character": "hero",
        "emotion": "determined",
        "text": "I must find the ancient artifact!",
        "duration": 3.1
      }
    ],
    "totalDuration": 45.8,
    "wordCount": 512
  }
}
```

---

#### 3. Get Voice Profiles

**Request Type**: `getVoiceProfiles`

Retrieve all available character voice profiles and their settings.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "getVoiceProfiles"
  }'
```

**Response**:
```json
{
  "success": true,
  "profiles": {
    "NARRATOR": {
      "name": "Narrator",
      "description": "Professional storytelling voice",
      "voiceConfig": {
        "voiceId": "eleven_multilingual_v2",
        "stability": 0.5,
        "similarity_boost": 0.75,
        "azureVoice": "en-US-GuyNeural",
        "speed": 1.0,
        "pitch": 1.0,
        "volume": 1.0
      },
      "emotionModifiers": {
        "neutral": { "speed": 1.0, "pitch": 1.0, "volume": 1.0 },
        "excited": { "speed": 1.1, "pitch": 1.05, "volume": 1.1 }
      }
    }
  }
}
```

---

## Function 3: omniclaw-media

**Endpoint**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media`
**Version**: 2.0.0
**Purpose**: Unified media control across Spotify, YouTube, and Fen/Kodi

### Supported Platforms

| Platform | Capabilities | Authentication |
|----------|--------------|----------------|
| **Spotify** | Play, Search, Pause | Client Credentials Flow |
| **YouTube** | Play, Search | API Key |
| **Fen/Kodi** | Search, Play | JSON-RPC (local network) |

### Resilience Features

- **Circuit Breaker**: Opens after 5 consecutive failures, resets after 60s
- **Automatic Retry**: Up to 3 retries with exponential backoff
- **Timeout Protection**: 30s default (5s for Kodi)
- **Graceful Fallback**: Returns success even if device not active

---

### Endpoints

#### 1. Play Media

**Request Type**: `play`

Play media on specified platform.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "play",
    "platform": "spotify",
    "action": "track",
    "params": {
      "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
    }
  }'
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestType` | string | Yes | Must be `"play"` |
| `platform` | string | Yes | "spotify", "youtube", "fen", "kodi" |
| `action` | string | Yes | "track", "video", "search" |
| `params` | object | No | Action-specific parameters |

**Spotify Example**:
```json
{
  "platform": "spotify",
  "action": "track",
  "params": {
    "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
  }
}
```

**YouTube Example**:
```json
{
  "platform": "youtube",
  "action": "video",
  "params": {
    "videoId": "dQw4w9WgXcQ"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "platform": "spotify",
    "action": "play",
    "track": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
    "message": "Playback initiated (requires active device)"
  }
}
```

---

#### 2. Pause Playback

**Request Type**: `pause`

Pause playback on specified platform.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "pause",
    "platform": "spotify"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "platform": "spotify",
    "action": "pause",
    "message": "Paused"
  }
}
```

---

#### 3. Search Media

**Request Type**: `search`

Search for media on specified platform.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "search",
    "platform": "spotify",
    "params": {
      "query": "Bohemian Rhapsody"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "Bohemian Rhapsody",
      "artist": "Queen",
      "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
    }
  ]
}
```

---

#### 4. Unified Search (New!)

**Request Type**: `unifiedSearch`

Search across multiple platforms simultaneously.

**Request**:
```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedSearch",
    "params": {
      "query": "Never Gonna Give You Up",
      "platforms": ["spotify", "youtube"]
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "spotify": [
      {
        "name": "Never Gonna Give You Up",
        "artist": "Rick Astley",
        "uri": "spotify:track:4cOdK2wGLETKBW3PvgPWqT"
      }
    ],
    "youtube": [
      {
        "title": "Rick Astley - Never Gonna Give You Up",
        "videoId": "dQw4w9WgXcQ",
        "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg"
      }
    ]
  }
}
```

---

#### 5. Device Management

**Get Available Devices**

```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "getDevices",
    "platform": "spotify"
  }'
```

**Set Active Device**

```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "setDevice",
    "params": {
      "deviceId": "abc123def456",
      "setDevicePlatform": "spotify"
    }
  }'
```

---

#### 6. Unified Playback Controls

**Play Media**

```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedPlay",
    "params": {
      "mediaId": "4iV5W9uYEdYUVa79Axb7Rh",
      "playPlatform": "spotify"
    }
  }'
```

**Skip to Next**

```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedNext",
    "platform": "spotify"
  }'
```

**Previous Track**

```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedPrevious",
    "platform": "spotify"
  }'
```

**Set Volume**

```bash
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "setVolume",
    "params": {
      "volume": 75,
      "volumePlatform": "spotify"
    }
  }'
```

---

## Error Handling

### Standard Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "stack": "Detailed stack trace (development only)"
}
```

### Common HTTP Status Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| `200` | Success | Request completed successfully |
| `204` | No Content | CORS preflight request |
| `400` | Bad Request | Invalid requestType, missing parameters |
| `405` | Method Not Allowed | Wrong HTTP method (e.g., GET on POST endpoint) |
| `500` | Server Error | Internal error, check error message |

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Unknown request type` | Invalid `requestType` value | Check valid request types for each function |
| `text is required for TTS` | Missing `text` parameter | Include `params.text` in request |
| `Circuit breaker open` | Too many recent failures | Wait 60s before retrying |
| `Timeout` | Request exceeded time limit | Check external service status, reduce complexity |
| `Unsupported platform` | Invalid platform name | Use: spotify, youtube, fen, kodi |
| `Invalid URL format` | Malformed product URL | Verify URL structure |

---

## Troubleshooting

### 1. CORS Errors

**Problem**: Browser blocks requests with CORS error
**Solution**: Functions have CORS enabled. Ensure you're not setting custom `Origin` headers.

### 2. Timeout Errors

**Problem**: Requests timeout after 30-60s
**Solution**:
- Story generation can take 10-20s
- Price checking with scraping may take 15-30s
- Implement client-side timeout handling

### 3. Authentication Errors

**Problem**: API returns 401/403 (future implementation)
**Solution**:
- Verify API keys in Cloud Functions environment
- Check service account permissions

### 4. Circuit Breaker Issues

**Problem**: All requests fail with "Circuit breaker open"
**Solution**:
- Wait 60s for automatic reset
- Check external service status (Spotify API, YouTube API)
- Review error logs for root cause

### 5. Memory Limits

**Problem**: Function crashes with out-of-memory error
**Solution**:
- Story function: Reduce story length or duration
- Price function: Limit products per checkPrices call
- Media function: Reduce batch operations

### 6. Rate Limiting

**Problem**: Too many requests, throttled by external APIs
**Solution**:
- Implement exponential backoff
- Cache search results
- Use Cloud Tasks for bulk operations

---

## Quick Start Examples

### Price Tracking Workflow

```bash
# 1. Add product
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "addProduct",
    "userId": "user_123",
    "params": {
      "url": "https://amazon.com/dp/B08N5WRWNW",
      "threshold": 299.99,
      "platform": "amazon"
    }
  }'

# 2. Check prices immediately
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "checkPrices",
    "userId": "user_123"
  }'

# 3. Get price history
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "getPriceHistory",
    "params": {
      "productId": "abc123def456"
    }
  }'
```

### Story Generation Workflow

```bash
# 1. Generate story
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "generateStory",
    "params": {
      "genre": "fantasy",
      "characters": ["hero", "villain"],
      "duration": "short"
    }
  }'

# 2. Convert to speech
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "textToSpeech",
    "params": {
      "text": "Once upon a time in a land far away...",
      "character": "narrator",
      "emotion": "mysterious"
    }
  }'
```

### Media Control Workflow

```bash
# 1. Search across platforms
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedSearch",
    "params": {
      "query": "Never Gonna Give You Up",
      "platforms": ["spotify", "youtube"]
    }
  }'

# 2. Play on Spotify
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedPlay",
    "params": {
      "mediaId": "4cOdK2wGLETKBW3PvgPWqT",
      "playPlatform": "spotify"
    }
  }'

# 3. Pause playback
curl -X POST \
  https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H 'Content-Type: application/json' \
  -d '{
    "requestType": "unifiedPause",
    "platform": "spotify"
  }'
```

---

## Performance Characteristics

### Latency Expectations

| Operation | Typical Latency | P95 Latency |
|-----------|----------------|-------------|
| Price: Add product | 200-500ms | 1s |
| Price: Get tracked | 300-600ms | 1.5s |
| Price: Check prices | 1-3s | 5s |
| Story: TTS (cached) | 50-100ms | 200ms |
| Story: TTS (new) | 2-5s | 10s |
| Story: Generate story | 10-20s | 30s |
| Media: Search | 500ms-2s | 4s |
| Media: Play/Pause | 200-500ms | 1s |

### Optimization Tips

1. **Enable Caching**: Story TTS results are cached by text + character + emotion
2. **Batch Operations**: Use Cloud Tasks for bulk price checks
3. **Prefetch Content**: Load audio segments in advance for stories
4. **Use Unified Search**: Search multiple platforms in one request
5. **Implement Retry**: Use exponential backoff for transient failures

---

## Environment Variables

### Required Variables

Set these in Google Cloud Console for each function:

**omniclaw-price**:
- `PROJECT_ID`: `omniclaw-enhanced`
- `FIRESTORE_PROJECT`: `omniclaw-enhanced`

**omniclaw-story**:
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key (optional)
- `AZURE_SPEECH_KEY`: Azure Speech Services key (optional fallback)

**omniclaw-media**:
- `SPOTIFY_CLIENT_ID`: Spotify app client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify app client secret
- `YOUTUBE_API_KEY`: YouTube Data API v3 key
- `KODI_HOST`: Kodi/Fen IP address (optional)
- `KODI_PORT`: Kodi JSON-RPC port (default: 8080)

---

## Changelog

### Version 1.0.0 (2026-03-27)
- Initial API documentation
- All three functions documented
- Complete endpoint reference
- Troubleshooting guide added

---

## Support

For issues or questions:
1. Check this documentation first
2. Review Cloud Function logs in Google Cloud Console
3. Verify environment variables are set correctly
4. Test with the provided curl examples
5. Check external API status (Spotify, YouTube, Anthropic)

---

**Generated by Claude Code**
**Last Updated**: 2026-03-27
**Documentation Version**: 1.0.0
