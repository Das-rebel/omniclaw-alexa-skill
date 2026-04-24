# Quick Start Guide - Redis Streams Price Tracking

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd /Users/Subho/omniclaw-enhanced/apps/price-tracking
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
npx playwright install webkit
```

### 3. Configure Environment

Create `.env` file:

```bash
# Required
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Optional (for notifications)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
SENDGRID_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
```

### 4. Initialize System

```bash
npm run init
```

### 5. Start Tracking

```javascript
const coordinator = require('./services/price-tracking-coordinator');
const PriceTrackingCoordinator = coordinator.PriceTrackingCoordinator || coordinator;

async function main() {
  const c = new PriceTrackingCoordinator();
  await c.initialize();
  await c.start();

  // Track a product
  await c.trackProduct('user123', {
    url: 'https://amazon.com/dp/B08N5WRWNW',
    platform: 'amazon',
    alertConfig: {
      type: 'price_drop',
      threshold: 10,
      active: true
    }
  });
}

main().catch(console.error);
```

## Common Commands

### Initialize Redis Streams

```bash
node -e "const RedisStreamsService = require('./services/redis-streams-service'); const s = new RedisStreamsService(); s.initialize().then(() => console.log('✅ Initialized')).catch(console.error);"
```

### Create Scheduled Jobs

```bash
npm run create-scheduler
```

### Test Scraping

```bash
node -e "
const ScraperFactory = require('./scrapers/scraper-factory');
const factory = new ScraperFactory();
const scraper = factory.getScraper('amazon');
scraper.scrape('https://amazon.com/dp/B08N5WRWNW')
  .then(r => console.log('✅ Price:', r.data.price))
  .catch(e => console.error('❌ Error:', e.message));
"
```

### Check Queue Stats

```bash
node -e "
const RedisStreamsService = require('./services/redis-streams-service');
const s = new RedisStreamsService();
s.getStats().then(stats => console.log(JSON.stringify(stats, null, 2)));
"
```

### Add Manual Scraping Job

```bash
node -e "
const RedisStreamsService = require('./services/redis-streams-service');
const s = new RedisStreamsService();
s.addScrapingJob({
  url: 'https://amazon.com/dp/B08N5WRWNW',
  platform: 'amazon',
  productId: 'B08N5WRWNW',
  priority: 'high'
}).then(job => console.log('✅ Job added:', job.jobId));
"
```

## API Endpoints

### Track Product

```bash
curl -X POST http://localhost:3000/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "url": "https://amazon.com/dp/B08N5WRWNW",
    "platform": "amazon",
    "alertConfig": {
      "type": "price_drop",
      "threshold": 10,
      "active": true
    }
  }'
```

### Get Product Stats

```bash
curl http://localhost:3000/api/stats/B08N5WRWNW
```

### Get User Alerts

```bash
curl http://localhost:3000/api/alerts/user123
```

### Remove Tracking

```bash
curl -X DELETE http://localhost:3000/api/track/user123/B08N5WRWNW
```

## Alert Types

### Price Drop (10% threshold)

```javascript
{
  type: 'price_drop',
  threshold: 10,
  active: true
}
```

### Target Price (₹899)

```javascript
{
  type: 'target_price',
  targetPrice: 899,
  originalPrice: 1299,
  active: true
}
```

### Stock Available

```javascript
{
  type: 'stock_available',
  active: true
}
```

### Lightning Deals

```javascript
{
  type: 'lightning_deal',
  active: true
}
```

### Competitor Price (5% better)

```javascript
{
  type: 'competitor_price',
  threshold: 5,
  active: true
}
```

## File Structure

```
price-tracking/
├── scrapers/              # Platform scrapers
│   ├── base-scraper.js    # Base class with anti-detection
│   ├── amazon-scraper.js  # Amazon scraping
│   ├── flipkart-scraper.js # Flipkart scraping
│   ├── myntra-scraper.js  # Myntra scraping
│   └── scraper-factory.js # Scraper factory
│
├── services/              # Core services
│   ├── redis-streams-service.js      # Redis Streams
│   ├── price-analyzer.js             # Price analysis
│   ├── alert-evaluator.js            # Alert evaluation
│   ├── notification-service.js       # Notifications
│   ├── scheduler-service.js          # Cloud Scheduler
│   └── price-tracking-coordinator.js # Main orchestrator
│
├── config/                # Configuration files
│   └── platforms.js       # Platform-specific configs
│
├── .env                   # Environment variables
├── package.json           # Dependencies
├── DEPLOYMENT.md          # Full deployment guide
└── README.md              # This file
```

## Environment Variables

### Required

```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

### Optional (for full functionality)

```bash
# Firebase (FCM notifications)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Email notifications
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_key

# SMS notifications
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

# Alexa notifications
ALEXA_API_URL=https://your-alexa-api.com
ALEXA_API_KEY=your_key

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project
GOOGLE_CLOUD_REGION=us-central1
```

## Troubleshooting

### Scraping Fails

```bash
# Check Playwright installation
npx playwright install chromium

# Test manually
node -e "require('playwright').launch().then(b => b.close())"
```

### Redis Connection Error

```bash
# Verify credentials
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test connection
node -e "const {Redis} = require('@upstash/redis'); const r = new Redis({url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN}); r.ping().then(() => console.log('✅ Redis OK')).catch(e => console.error('❌ Redis Error:', e.message));"
```

### Notifications Not Sending

```bash
# Check Firebase credentials
echo $FIREBASE_SERVICE_ACCOUNT_KEY | jq .

# Test FCM
node -e "const admin = require('firebase-admin'); admin.initializeApp(); admin.messaging().send({token: 'test', notification: {title: 'Test', body: 'Test'}}).catch(e => console.log('Expected error:', e.message));"
```

## Next Steps

1. **Deploy to Cloud Run**: See `DEPLOYMENT.md`
2. **Set up Cloud Scheduler**: Run `npm run create-scheduler`
3. **Configure notifications**: Add Firebase/Email/SMS credentials
4. **Monitor performance**: Check `/health` endpoint
5. **Scale workers**: Deploy multiple instances

## Support

- Full documentation: `DEPLOYMENT.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Issues: GitHub Issues

## Quick Reference

| Task | Command |
|------|---------|
| Install | `npm install` |
| Initialize | `npm run init` |
| Start | `npm start` |
| Create scheduler | `npm run create-scheduler` |
| Test scraping | See above |
| Check stats | See above |

## Key Features

✅ Redis Streams (3 consumer groups)
✅ Stealth scraping (anti-detection)
✅ Historical tracking (2 years)
✅ Multi-platform comparison
✅ 8 alert types
✅ Multi-channel notifications
✅ Cloud Scheduler integration
✅ Horizontal scaling
✅ Production-ready

**Status**: Ready to deploy 🚀
