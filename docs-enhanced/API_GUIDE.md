# OmniClaw Enhanced API Usage Guide

Complete guide for integrating with the OmniClaw Enhanced API Gateway.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [API Endpoints](#api-endpoints)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [SDKs and Libraries](#sdks-and-libraries)

---

## Getting Started

### 1. Obtain API Key

First, generate an API key from the dashboard or via API:

```bash
curl -X POST https://gateway.omniclaw-enhanced.com/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -d '{
    "name": "My Application",
    "tier": "basic",
    "scopes": ["price:read", "story:write"]
  }'
```

Response:
```json
{
  "success": true,
  "apiKey": "sk_production_abc123def456...",
  "keyId": "sk_...def456",
  "name": "My Application",
  "tier": "basic",
  "scopes": ["price:read", "story:write"],
  "createdAt": "2026-03-27T10:30:00.000Z"
}
```

**Important**: Save your API key securely. It won't be shown again.

### 2. Make Your First Request

```bash
curl -X GET https://gateway.omniclaw-enhanced.com/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "uptime": 86400
}
```

---

## Authentication

### API Key Format

API keys use the format: `sk_{environment}_{random_key}`

Example: `sk_production_abc123def456...`

### Including API Key in Requests

Include your API key in the `Authorization` header:

```bash
curl -X POST https://gateway.omniclaw-enhanced.com/price/products \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "url": "https://amazon.com/dp/B08N5WRWNW"}'
```

### API Key Security

**Best Practices:**

1. **Never expose API keys** in client-side code
2. **Use environment variables** to store keys
3. **Rotate keys regularly** (every 90 days)
4. **Use scoped keys** with minimum required permissions
5. **Monitor usage** for suspicious activity

**Example: Environment Variables**

```bash
# .env file
OMNICLAW_API_KEY=sk_production_abc123...
OMNICLAW_API_URL=https://gateway.omniclaw-enhanced.com
```

**Example: Using in Code**

```javascript
// server-side only
const apiKey = process.env.OMNICLAW_API_KEY;

const response = await fetch('https://gateway.omniclaw-enhanced.com/price/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user_123',
    url: 'https://amazon.com/dp/B08N5WRWNW'
  })
});
```

---

## Rate Limiting

### Understanding Rate Limits

The API uses tier-based rate limiting:

| Tier | Hourly Limit | Minute Limit | Burst Limit |
|------|--------------|--------------|-------------|
| Free | 100 | 10 | 10 |
| Basic | 1,000 | 100 | 50 |
| Pro | 10,000 | 1,000 | 200 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Rate Limit Headers

Every response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1648392000
X-RateLimit-Tier: basic
```

### Handling Rate Limits

When you exceed your rate limit, you'll receive:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "success": false,
  "error": "Rate limit exceeded",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "retryAfter": 60
}
```

**Best Practices:**

1. **Implement exponential backoff**
2. **Cache responses** when possible
3. **Use bulk operations** for multiple requests
4. **Monitor remaining quota** via headers

**Example: Exponential Backoff**

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

---

## API Endpoints

### Health Check

Check API Gateway health status.

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "uptime": 86400
}
```

### Price Tracking

#### Add Product to Tracking

```bash
POST /price/products
```

**Request:**
```json
{
  "userId": "user_123",
  "url": "https://amazon.com/dp/B08N5WRWNW",
  "threshold": 299.99,
  "platform": "amazon",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product added to tracking",
  "productId": "abc123def456",
  "priority": "high"
}
```

#### Get Tracked Products

```bash
GET /price/products?userId=user_123&limit=50&offset=0
```

#### Get Price History

```bash
GET /price/products/{productId}/history?limit=100
```

#### Check Prices Immediately

```bash
POST /price/check
```

**Request:**
```json
{
  "userId": "user_123"
}
```

### Story Generation

#### Text-to-Speech

```bash
POST /story/tts
```

**Request:**
```json
{
  "text": "Once upon a time in a land far away...",
  "character": "narrator",
  "emotion": "mysterious"
}
```

**Response:**
```json
{
  "success": true,
  "audio": "base64_encoded_audio_data_here...",
  "cached": false,
  "character": "narrator",
  "emotion": "mysterious",
  "duration": 5.2
}
```

#### Generate Story

```bash
POST /story/generate
```

**Request:**
```json
{
  "genre": "fantasy",
  "characters": ["hero", "villain", "wise_old_man"],
  "duration": "long"
}
```

**Response:**
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
      }
    ],
    "totalDuration": 45.8,
    "wordCount": 512
  }
}
```

### Media Control

#### Play Media

```bash
POST /media/play
```

**Request:**
```json
{
  "platform": "spotify",
  "action": "track",
  "params": {
    "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
  }
}
```

#### Unified Search

```bash
POST /media/unified-search
```

**Request:**
```json
{
  "params": {
    "query": "Never Gonna Give You Up",
    "platforms": ["spotify", "youtube"]
  }
}
```

### Analytics

#### Get Usage Analytics

```bash
GET /analytics/usage?startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-27T23:59:59.999Z&granularity=day
```

#### Get Quota Status

```bash
GET /analytics/quota
```

**Response:**
```json
{
  "success": true,
  "quota": {
    "tier": "basic",
    "hourly": {
      "limit": 1000,
      "used": 50,
      "remaining": 950,
      "resetAt": "2026-03-27T11:00:00.000Z"
    },
    "daily": {
      "limit": 10000,
      "used": 500,
      "remaining": 9500,
      "resetAt": "2026-03-28T00:00:00.000Z"
    }
  }
}
```

---

## Best Practices

### 1. Error Handling

Always implement proper error handling:

```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!data.success) {
    console.error('API Error:', data.error);
    return;
  }

  // Process successful response
} catch (error) {
  console.error('Network Error:', error);
}
```

### 2. Request Validation

Validate requests before sending:

```javascript
function validateProductRequest(data) {
  if (!data.userId || typeof data.userId !== 'string') {
    throw new Error('Invalid userId');
  }

  if (!data.url || !isValidUrl(data.url)) {
    throw new Error('Invalid URL');
  }

  if (data.threshold && (typeof data.threshold !== 'number' || data.threshold < 0)) {
    throw new Error('Invalid threshold');
  }

  return true;
}
```

### 3. Caching

Cache responses to reduce API calls:

```javascript
const cache = new Map();

async function getCachedProduct(productId) {
  const cacheKey = `product:${productId}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const response = await fetch(`/price/products/${productId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });

  const data = await response.json();
  cache.set(cacheKey, data);

  // Expire cache after 5 minutes
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);

  return data;
}
```

### 4. Batch Operations

Use bulk operations when possible:

```javascript
// Instead of multiple requests
for (const url of urls) {
  await addProduct(url);
}

// Use batch operation
await Promise.all(urls.map(url => addProduct(url)));
```

### 5. Monitoring

Monitor your API usage:

```javascript
function logRateLimitInfo(response) {
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');

  console.log(`Rate Limit: ${remaining}/${limit} remaining`);
  console.log(`Resets at: ${new Date(parseInt(reset) * 1000)}`);

  if (remaining < limit * 0.1) {
    console.warn('Low rate limit quota!');
  }
}
```

---

## Troubleshooting

### Common Errors

#### 401 Unauthorized

**Cause**: Invalid or missing API key

**Solution**:
1. Verify API key is correct
2. Check key hasn't expired
3. Ensure key has required scopes

#### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Solution**:
1. Wait for `Retry-After` seconds
2. Implement exponential backoff
3. Upgrade tier for higher limits

#### 400 Bad Request

**Cause**: Invalid request format

**Solution**:
1. Check request body format
2. Verify required fields
3. Validate data types

#### 500 Internal Server Error

**Cause**: Server error

**Solution**:
1. Check status page: https://status.omniclaw-enhanced.com
2. Report issue if persistent
3. Implement retry logic

### Debug Mode

Enable debug mode for detailed error messages:

```javascript
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'X-Debug': 'true'
  }
});
```

---

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @omniclaw-enhanced/sdk
```

```javascript
import { OmniClawClient } from '@omniclaw-enhanced/sdk';

const client = new OmniClawClient({
  apiKey: process.env.OMNICLAW_API_KEY,
  baseUrl: 'https://gateway.omniclaw-enhanced.com'
});

const product = await client.price.addProduct({
  userId: 'user_123',
  url: 'https://amazon.com/dp/B08N5WRWNW',
  threshold: 299.99
});
```

### Python

```bash
pip install omniclaw-enhanced
```

```python
import omniclaw

client = omniclaw.Client(
    api_key="your_api_key",
    base_url="https://gateway.omniclaw-enhanced.com"
)

product = client.price.add_product(
    user_id="user_123",
    url="https://amazon.com/dp/B08N5WRWNW",
    threshold=299.99
)
```

### cURL Examples

See endpoint documentation above for cURL examples.

---

## Support

- **Documentation**: https://docs.omniclaw-enhanced.com
- **Status Page**: https://status.omniclaw-enhanced.com
- **GitHub Issues**: https://github.com/omniclaw-enhanced/gateway/issues
- **Email**: support@omniclaw-enhanced.com
- **Discord**: https://discord.gg/omniclaw-enhanced

---

**Version**: 1.0.0
**Last Updated**: 2026-03-27
