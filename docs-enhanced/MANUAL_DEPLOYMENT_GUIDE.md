# OmniClaw Enhanced - Manual Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy omniclaw-price and omniclaw-analytics Cloud Functions with full implementations.

## Prerequisites
- Google Cloud SDK installed and configured
- Active Google Cloud project: `omniclaw-enhanced`
- Environment variables set in `/Users/Subho/omniclaw-enhanced/.env`

## Task 1: Deploy omniclaw-price (Redis Streams + Playwright)

### Step 1: Prepare Function Directory

```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-price

# Clean existing files
rm -rf scrapers services config notifiers processors src

# Create directory structure
mkdir -p scrapers services config notifiers processors src
```

### Step 2: Copy Source Files

```bash
# Define source directory
SOURCE_DIR="/Users/Subho/omniclaw-enhanced/apps/price-tracking"

# Copy all scrapers
cp -r "$SOURCE_DIR/scrapers/"*.js scrapers/

# Copy all services
cp -r "$SOURCE_DIR/services/"*.js services/

# Copy config
cp -r "$SOURCE_DIR/config/"* config/ 2>/dev/null || true

# Copy notifiers
cp -r "$SOURCE_DIR/notifiers/"* notifiers/ 2>/dev/null || true

# Copy processors
cp -r "$SOURCE_DIR/processors/"* processors/ 2>/dev/null || true

# Copy src
cp -r "$SOURCE_DIR/src/"* src/ 2>/dev/null || true

# Copy additional files
cp "$SOURCE_DIR/resilient-scrapers.js" . 2>/dev/null || true
```

### Step 3: Create package.json

The directory should already have a `package.json` with these dependencies:

```json
{
  "name": "omniclaw-price-function",
  "version": "2.0.0",
  "description": "Redis Streams Price Tracking with Playwright",
  "main": "index.js",
  "dependencies": {
    "@upstash/redis": "^1.25.1",
    "playwright": "^1.40.0",
    "firebase-admin": "^12.0.0",
    "node-fetch": "^3.3.2",
    "@sendgrid/mail": "^8.1.0",
    "twilio": "^4.19.0",
    "aws-sdk": "^2.1500.0",
    "google-auth-library": "^9.4.0",
    "uuid": "^9.0.1",
    "winston": "^3.11.0",
    "joi": "^17.11.0",
    "axios": "^1.6.5",
    "cheerio": "^1.0.0-rc.12"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 4: Update index.js

Replace the existing `index.js` with the full implementation. The file should:

1. Import `PriceTrackingCoordinator` from services
2. Initialize coordinator on first request
3. Handle request types: `addProduct`, `checkPrices`, `getTracked`, `removeProduct`
4. Return real scraped data, not mock data

### Step 5: Install Dependencies

```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-price
npm install --production
```

### Step 6: Deploy to Google Cloud

```bash
# Load environment variables
cd /Users/Subho/omniclaw-enhanced
export $(cat .env | grep -v '^#' | xargs)

# Deploy
cd deploy/functions/omniclaw-price
gcloud functions deploy omniclaw-price \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --source=. \
  --entry-point=priceHandler \
  --trigger-http \
  --allow-unauthenticated \
  --memory=2048MB \
  --timeout=540s \
  --set-env-vars=UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL \
  --set-env-vars=UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY \
  --set-env-vars=SENDGRID_API_KEY=$SENDGRID_API_KEY \
  --set-env-vars=TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID \
  --set-env-vars=TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
```

### Step 7: Test Deployment

```bash
# Test health check
curl "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health"

# Test add product
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  -H "Content-Type: application/json" \
  -d '{"requestType":"addProduct","userId":"test-user-123","productUrl":"https://www.amazon.com/dp/B08N5WRWNW"}'

# Test get tracked
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  -H "Content-Type: application/json" \
  -d '{"requestType":"getTracked","userId":"test-user-123"}'
```

---

## Task 2: Deploy omniclaw-analytics (Real-time Metrics)

### Step 1: Prepare Function Directory

```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-analytics

# Clean existing files
rm -rf services middleware api dashboard

# Create directory structure
mkdir -p services middleware api dashboard
```

### Step 2: Copy Source Files

```bash
# Define source directory
SOURCE_DIR="/Users/Subho/omniclaw-enhanced/apps/analytics"

# Copy all services
cp -r "$SOURCE_DIR/services/"*.js services/

# Copy middleware
cp -r "$SOURCE_DIR/middleware/"* middleware/

# Copy API
cp -r "$SOURCE_DIR/api/"* api/

# Copy dashboard
cp -r "$SOURCE_DIR/dashboard/"* dashboard/ 2>/dev/null || true
```

### Step 3: Create package.json

```json
{
  "name": "omniclaw-analytics-function",
  "version": "1.0.0",
  "description": "Real-time Analytics Service",
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "@upstash/redis": "^1.25.1",
    "ioredis": "^5.3.2",
    "winston": "^3.11.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 4: Update index.js

Replace the existing `index.js` with the full implementation. The file should:

1. Import `AnalyticsService` from services
2. Initialize service on first request
3. Handle request types: `trackEvent`, `trackRequest`, `getMetrics`, `getReport`, `getUserStats`
4. Store events in Firestore and Redis

### Step 5: Install Dependencies

```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-analytics
npm install --production
```

### Step 6: Deploy to Google Cloud

```bash
# Load environment variables
cd /Users/Subho/omniclaw-enhanced
export $(cat .env | grep -v '^#' | xargs)

# Deploy
cd deploy/functions/omniclaw-analytics
gcloud functions deploy omniclaw-analytics \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --source=. \
  --entry-point=analyticsHandler \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=60s \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY \
  --set-env-vars=UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL \
  --set-env-vars=UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN
```

### Step 7: Test Deployment

```bash
# Test health check
curl "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics/health"

# Test track event
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics" \
  -H "Content-Type: application/json" \
  -d '{"requestType":"trackEvent","userId":"test-user-123","metricData":{"feature":"email","action":"readEmails"}}'

# Test get metrics
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics" \
  -H "Content-Type: application/json" \
  -d '{"requestType":"getMetrics","userId":"test-user-123","startDate":"2026-03-19T00:00:00Z","endDate":"2026-03-26T23:59:59Z","granularity":"daily"}'
```

---

## Verification Checklist

### omniclaw-price
- [ ] Function deployed successfully
- [ ] Health check returns 200
- [ ] addProduct creates tracking entry
- [ ] Scrapers return real data (not mock)
- [ ] Redis Streams integration working
- [ ] Playwright browsers launching
- [ ] Response time < 30s

### omniclaw-analytics
- [ ] Function deployed successfully
- [ ] Health check returns 200
- [ ] trackEvent stores in database
- [ ] getMetrics returns aggregated data
- [ ] Response time < 2s
- [ ] Real-time counters in Redis

## Troubleshooting

### Issue: Permission Denied
```bash
# Make scripts executable
chmod +x /Users/Subho/omniclaw-enhanced/deploy-omniclaw-*.sh
```

### Issue: Missing Dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install --production
```

### Issue: Environment Variables Not Set
```bash
# Verify variables are set
echo $UPSTASH_REDIS_REST_URL
echo $FIREBASE_SERVICE_ACCOUNT_KEY

# Re-source .env if needed
cd /Users/Subho/omniclaw-enhanced
export $(cat .env | grep -v '^#' | xargs)
```

### Issue: Playwright Not Working
```bash
# Install Playwright browsers manually
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-price
npx playwright install chromium
```

## Success Criteria

Both functions are successfully deployed when:

1. **Deployment**: Both functions show "Deployed" status in Google Cloud Console
2. **Health Checks**: Both `/health` endpoints return 200 OK
3. **Real Data**: Price function returns scraped product data (not mock data)
4. **Database**: Analytics function writes to Firestore collections
5. **Performance**: Response times within targets (< 30s price, < 2s analytics)
6. **Monitoring**: Functions appear in Cloud Monitoring with metrics

## Next Steps

After successful deployment:

1. Set up Cloud Scheduler for periodic price checks
2. Configure alerts for function failures
3. Monitor costs in Cloud Billing
4. Add integration tests
5. Update documentation with actual function URLs
