# Quick Deployment Reference

## Deploy OmniClaw Price & Analytics Functions

### Prerequisites
```bash
# Verify gcloud is configured
gcloud config list
gcloud auth list

# Check environment variables
cd /Users/Subho/omniclaw-enhanced
cat .env | grep -E "UPSTASH|FIREBASE|SENDGRID|TWILIO"
```

---

## Option 1: Quick Deploy (Recommended)

### Deploy Price Function
```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-price

# Use full implementation
cp index-full.js index.js

# Install dependencies
npm install --production

# Deploy
export $(cat ../../.env | grep -v '^#' | xargs)
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

### Deploy Analytics Function
```bash
cd /Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-analytics

# Use full implementation
cp index-full.js index.js

# Install dependencies
npm install --production

# Deploy
export $(cat ../../.env | grep -v '^#' | xargs)
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

---

## Option 2: Copy Files First

```bash
cd /Users/Subho/omniclaw-enhanced

# Price function
cd deploy/functions/omniclaw-price
rm -rf scrapers services config notifiers processors src
mkdir -p scrapers services config notifiers processors src
cp -r ../../../apps/price-tracking/scrapers/*.js scrapers/
cp -r ../../../apps/price-tracking/services/*.js services/
cp -r ../../../apps/price-tracking/config/* config/ 2>/dev/null || true
cp -r ../../../apps/price-tracking/notifiers/* notifiers/ 2>/dev/null || true
cp -r ../../../apps/price-tracking/processors/* processors/ 2>/dev/null || true
cp -r ../../../apps/price-tracking/src/* src/ 2>/dev/null || true
cp index-full.js index.js
npm install --production

# Analytics function
cd ../omniclaw-analytics
rm -rf services middleware api dashboard
mkdir -p services middleware api dashboard
cp -r ../../../apps/analytics/services/*.js services/
cp -r ../../../apps/analytics/middleware/* middleware/
cp -r ../../../apps/analytics/api/* api/
cp -r ../../../apps/analytics/dashboard/* dashboard/ 2>/dev/null || true
cp index-full.js index.js
npm install --production
```

Then deploy as shown in Option 1.

---

## Test Deployments

### Test Price Function
```bash
# Health check
curl "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health"

# Add product
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "addProduct",
    "userId": "test-user-123",
    "productUrl": "https://www.amazon.com/dp/B08N5WRWNW",
    "threshold": 100
  }'

# Get tracked products
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "getTracked",
    "userId": "test-user-123"
  }'
```

### Test Analytics Function
```bash
# Health check
curl "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics/health"

# Track event
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "trackEvent",
    "userId": "test-user-123",
    "eventType": "feature_use",
    "data": {
      "feature": "email",
      "action": "readEmails"
    }
  }'

# Get metrics
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "getMetrics",
    "userId": "test-user-123",
    "startDate": "2026-03-19T00:00:00Z",
    "endDate": "2026-03-26T23:59:59Z",
    "granularity": "daily"
  }'
```

---

## Verify Deployment

```bash
# List functions
gcloud functions list

# Get function info
gcloud functions describe omniclaw-price --region=us-central1 --gen2
gcloud functions describe omniclaw-analytics --region=us-central1 --gen2

# View logs
gcloud functions logs read omniclaw-price --region=us-central1 --gen2 --limit=50
gcloud functions logs read omniclaw-analytics --region=us-central1 --gen2 --limit=50
```

---

## Troubleshooting

### Deployment Fails
```bash
# Check quota
gcloud compute regions describe us-central1 | grep quota

# Check logs
gcloud functions logs read omniclaw-price --region=us-central1 --gen2 --limit=100
```

### Function Returns Errors
```bash
# Real-time logs
gcloud functions logs read omniclaw-price --region=us-central1 --gen2 --follow

# Check environment variables
gcloud functions describe omniclaw-price --region=us-central1 --gen2 --format="value(serviceConfig.environmentVariables)"
```

### Permission Denied
```bash
# Check IAM permissions
gcloud projects get-iam-policy omniclaw-enhanced | grep your-email

# Grant Cloud Functions permission
gcloud projects add-iam-policy-binding omniclaw-enhanced \
  --member=user:your-email@gmail.com \
  --role=roles/cloudfunctions.developer
```

---

## Success Checklist

### Price Function
- [ ] Deployed successfully
- [ ] Health check returns 200
- [ ] addProduct works
- [ ] getTracked returns products
- [ ] Scrapers return real data
- [ ] Response time < 30s

### Analytics Function
- [ ] Deployed successfully
- [ ] Health check returns 200
- [ ] trackEvent stores data
- [ ] getMetrics returns data
- [ ] Response time < 2s
- [ ] Data visible in Firestore

---

## Next Steps After Deployment

1. **Set up Cloud Scheduler** for periodic price checks
2. **Configure alerts** for function failures
3. **Monitor costs** in Cloud Billing
4. **Update documentation** with actual URLs
5. **Test with real products** and verify scraping

---

## Quick Links

- Google Cloud Console: https://console.cloud.google.com
- Cloud Functions: https://console.cloud.google.com/functions/list
- Cloud Logging: https://console.cloud.google.com/logs
- Cloud Monitoring: https://console.cloud.google.com/monitoring
- Deployment Summary: `/Users/Subho/omniclaw-enhanced/DEPLOYMENT_AGENT2_SUMMARY.md`
- Manual Guide: `/Users/Subho/omniclaw-enhanced/MANUAL_DEPLOYMENT_GUIDE.md`
