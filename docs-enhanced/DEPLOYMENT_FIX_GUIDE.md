# Quick Deployment Fix Guide

## Issue: Container Healthcheck Failed

The Cloud Functions deployment is failing because the container isn't listening on `PORT=8080`.

## Root Cause

The `omniclawHealth` function in `/Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-health/index.js` is likely not properly exporting an HTTP handler that Cloud Functions Gen 2 expects.

## Solution

Update the health function to properly export an HTTP handler:

### Current Implementation (Probably Wrong)

```javascript
// Current index.js might have:
function omniclawHealth(req, res) {
  // ... handler code
}

exports.omniclawHealth = omniclawHealth;
```

### Required Fix

```javascript
// Correct format for Cloud Functions Gen 2:
exports.omniclawHealth = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Health check logic
  try {
    const path = req.path || new URL(req.url).pathname;

    if (path === '/' || path === '/health') {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'omniclaw-health'
      });
      return;
    }

    if (path === '/clients') {
      // ... client list logic
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Quick Fix Steps

1. **Edit the health function**:
```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-health
nano index.js
```

2. **Add PORT binding** (if using Express):
```javascript
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```

3. **OR use simpler handler** (recommended):
```javascript
exports.omniclawHealth = async (req, res) => {
  res.status(200).json({ status: 'ok' });
};
```

4. **Deploy again**:
```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-health
gcloud functions deploy omniclaw-health \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --source=. \
  --entry-point=omniclawHealth \
  --trigger-http \
  --allow-unauthenticated \
  --memory=2048MB \
  --timeout=120s
```

## Alternative: Use Minimal Health Check

Create a minimal working version first:

```javascript
// /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-health/index.js

exports.omniclawHealth = async (req, res) => {
  console.log('Health check called');

  res.set('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'OmniClaw Health Service',
    version: '2.2.0'
  });
};
```

## Verify Deployment

After deployment, test with:
```bash
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-26T...",
  "message": "OmniClaw Health Service",
  "version": "2.2.0"
}
```

## Time Estimate

- **Fix implementation**: 5 minutes
- **Deployment**: 2-3 minutes
- **Verification**: 1 minute
- **Total**: ~10 minutes

---

**Priority**: HIGH - This is the only blocker preventing full system deployment
**Complexity**: LOW - Simple HTTP handler fix
**Risk**: MINIMAL - Can be easily rolled back if needed
