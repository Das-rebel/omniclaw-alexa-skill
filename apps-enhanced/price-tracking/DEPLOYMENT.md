# Price Tracking System Deployment Guide

Complete Redis Streams price tracking system with stealth scraping capabilities.

## Architecture Overview

### Components

1. **Scrapers** (`/scrapers/`)
   - `base-scraper.js` - Base scraper with anti-detection
   - `amazon-scraper.js` - Amazon scraping
   - `flipkart-scraper.js` - Flipkart scraping
   - `myntra-scraper.js` - Myntra scraping
   - `scraper-factory.js` - Scraper factory pattern

2. **Services** (`/services/`)
   - `redis-streams-service.js` - Redis Streams management
   - `price-analyzer.js` - Price analysis & trend detection
   - `alert-evaluator.js` - Alert threshold evaluation
   - `notification-service.js` - Multi-channel notifications
   - `scheduler-service.js` - Cloud Scheduler integration
   - `price-tracking-coordinator.js` - Main orchestrator

### Redis Streams Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Redis Streams                            │
├─────────────────────────────────────────────────────────────┤
│  scraping-queue    ──→  [scrapers-group]                    │
│  analysis-queue    ──→  [analyzers-group]                   │
│  alerts-queue      ──→  [notifiers-group]                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Cloud Scheduler → Coordinator → Scraping Queue
2. Scraping Queue → Scraper Workers → Analysis Queue
3. Analysis Queue → Price Analyzer → Alert Evaluator → Alerts Queue
4. Alerts Queue → Notification Service → Users
```

## Environment Variables

Create `.env` file:

```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
SERVICE_URL=https://your-service-url.com

# Firebase (FCM)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Email (SendGrid/SNS)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=alerts@omniclaw.app

# SMS (Twilio/SNS)
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Alexa Integration
ALEXA_API_URL=https://your-alexa-api.com/api/notify
ALEXA_API_KEY=your_alexa_api_key

# Webhook Security
WEBHOOK_SECRET=your_webhook_secret

# Cloud Scheduler Service Account
CLOUD_SCHEDULER_SA=cloud-scheduler@your-project.iam.gserviceaccount.com
```

## Installation

### 1. Install Dependencies

```bash
cd /Users/Subho/omniclaw-enhanced/apps/price-tracking
npm install
```

### Required Packages

```json
{
  "dependencies": {
    "@upstash/redis": "^1.25.1",
    "playwright": "^1.40.0",
    "firebase-admin": "^12.0.0",
    "node-fetch": "^3.3.2",
    "@sendgrid/mail": "^8.1.0",
    "twilio": "^4.19.0",
    "aws-sdk": "^2.1500.0",
    "google-auth-library": "^9.4.0",
    "uuid": "^9.0.1"
  }
}
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
npx playwright install webkit
```

### 3. Initialize Redis Streams

```bash
node services/price-tracking-coordinator.js init
```

## Deployment Options

### Option 1: Google Cloud Run (Recommended)

#### Deploy Coordinator Service

```bash
# Build
gcloud builds submit --tag gcr.io/PROJECT_ID/price-tracking-coordinator

# Deploy
gcloud run deploy price-tracking-coordinator \
  --image gcr.io/PROJECT_ID/price-tracking-coordinator \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2 \
  --max-instances 10 \
  --min-instances 0 \
  --env-vars-file .env
```

#### Deploy Worker Service

```bash
# Deploy multiple workers for parallel processing
gcloud run deploy price-tracking-worker \
  --image gcr.io/PROJECT_ID/price-tracking-coordinator \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2 \
  --max-instances 20 \
  --min-instances 1
```

### Option 2: Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    wget

# Install application
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Install Playwright browsers
RUN npx playwright install-deps chromium
RUN npx playwright install chromium

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium

CMD ["node", "services/price-tracking-coordinator.js"]
```

#### Deploy

```bash
# Build
docker build -t price-tracking .

# Run
docker run -d \
  --name price-tracking \
  --env-file .env \
  --restart unless-stopped \
  price-tracking
```

### Option 3: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: price-tracking-coordinator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: price-tracking
  template:
    metadata:
      labels:
        app: price-tracking
    spec:
      containers:
      - name: coordinator
        image: gcr.io/PROJECT_ID/price-tracking-coordinator
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: UPSTASH_REDIS_REST_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: price-tracking-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: price-tracking-worker
  template:
    metadata:
      labels:
        app: price-tracking-worker
    spec:
      containers:
      - name: worker
        image: gcr.io/PROJECT_ID/price-tracking-coordinator
        command: ["node", "services/price-tracking-coordinator.js", "worker"]
```

## Cloud Scheduler Setup

### Create Scheduled Jobs

```bash
# Authenticate
gcloud auth login

# Create jobs
node -e "
const SchedulerService = require('./services/scheduler-service');
const scheduler = new SchedulerService();
scheduler.createScheduledJobs().then(console.log).catch(console.error);
"
```

### Manual Job Creation via Console

1. Go to Google Cloud Console → Cloud Scheduler
2. Create job with:
   - **Name**: `price-tracking-2hour`
   - **Schedule**: `0 */2 * * *`
   - **Timezone**: `Asia/Kolkata`
   - **Target**: HTTP
   - **URL**: `https://your-service-url.com/schedule/scrape`
   - **HTTP Method**: POST
   - **Body**: `{"priority":"high","interval":"2hour"}`

## API Endpoints

### Start Tracking Product

```bash
POST /api/track
Content-Type: application/json

{
  "userId": "user123",
  "url": "https://amazon.com/dp/B08N5WRWNW",
  "platform": "amazon",
  "alertConfig": {
    "type": "price_drop",
    "threshold": 10,
    "active": true,
    "priority": "high"
  }
}
```

### Get Product Stats

```bash
GET /api/stats/:productId
```

### Get User Alerts

```bash
GET /api/alerts/:userId
```

### Remove Product Tracking

```bash
DELETE /api/track/:userId/:productId
```

## Monitoring

### Health Checks

```bash
# Service health
GET /health

# Redis connection
GET /health/redis

# Queue stats
GET /health/queues
```

### Metrics

- Active jobs count
- Queue lengths
- Consumer lag
- Scraping success rate
- Alert delivery rate

### Logging

```javascript
// Logs are sent to Cloud Logging
logger.info('Scraping completed', { productId, price });
logger.error('Scraping failed', { error, url });
```

## Scaling

### Vertical Scaling

```bash
# Increase memory/CPU for coordinator
gcloud run deploy price-tracking-coordinator \
  --memory 2Gi \
  --cpu 4
```

### Horizontal Scaling

```bash
# Add more workers
gcloud run deploy price-tracking-worker \
  --max-instances 50
```

### Auto-scaling Rules

- Scale up when: Queue length > 100
- Scale down when: Queue length < 10 & CPU < 20%
- Max instances: 50
- Min instances: 1

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

```bash
# Test scraping
node -e "
const ScraperFactory = require('./scrapers/scraper-factory');
const factory = new ScraperFactory();
const scraper = factory.getScraper('amazon');
scraper.scrape('https://amazon.com/dp/B08N5WRWNW')
  .then(console.log)
  .catch(console.error);
"

# Test Redis Streams
node -e "
const RedisStreamsService = require('./services/redis-streams-service');
const streams = new RedisStreamsService();
streams.initialize().then(() => {
  return streams.addScrapingJob({
    url: 'https://amazon.com/dp/B08N5WRWNW',
    platform: 'amazon',
    productId: 'B08N5WRWNW'
  });
}).then(console.log).catch(console.error);
"
```

## Troubleshooting

### Scraping Failures

1. Check browser logs in Cloud Logging
2. Verify Playwright browsers are installed
3. Check proxy configuration
4. Review rate limiting settings

### Redis Connection Issues

1. Verify UPSTASH_REDIS_REST_URL
2. Check network connectivity
3. Review Redis logs in Upstash console

### Notification Delivery Issues

1. Check Firebase service account key
2. Verify FCM tokens are registered
3. Review notification delivery logs
4. Check rate limiting counters

### High Memory Usage

1. Reduce max concurrent jobs
2. Implement data pagination
3. Clear old history more frequently
4. Add memory limits to containers

## Performance Optimization

### Scraping Optimization

1. Use browser fingerprint rotation
2. Implement adaptive delays
3. Cache product metadata
4. Use lightweight browsers

### Queue Optimization

1. Adjust batch sizes
2. Implement priority queues
3. Use consumer group balancing
4. Monitor consumer lag

### Notification Optimization

1. Batch similar notifications
2. Use push notification batching
3. Implement smart aggregation
4. Cache user preferences

## Security

### API Security

1. Use API keys for all endpoints
2. Implement rate limiting
3. Add request signing
4. Validate all inputs

### Data Security

1. Encrypt sensitive data at rest
2. Use TLS for all communications
3. Implement secure token storage
4. Regular security audits

### Secrets Management

1. Use Google Secret Manager
2. Rotate secrets regularly
3. Implement secret versioning
4. Audit secret access

## Cost Optimization

### Redis Optimization

1. Set appropriate TTLs
2. Use data compression
3. Clean old data regularly
4. Monitor memory usage

### Compute Optimization

1. Use min_instances: 0 for auto-scaling
2. Implement request batching
3. Use preemptible VMs where possible
4. Optimize container sizes

### Network Optimization

1. Use VPC for internal communication
2. Implement request caching
3. Use CDN for static assets
4. Monitor data transfer costs

## Maintenance

### Daily Tasks

- Monitor queue lengths
- Check error rates
- Review notification delivery
- Verify scraping success

### Weekly Tasks

- Clean old data
- Review performance metrics
- Update selectors if needed
- Check cost reports

### Monthly Tasks

- Rotate secrets
- Update dependencies
- Review security logs
- Optimize queries

## Support

For issues and questions:
- GitHub Issues: [project-url]/issues
- Documentation: [project-url]/docs
- Email: support@omniclaw.app
