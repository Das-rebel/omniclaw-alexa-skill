# OmniClaw Enhanced - Deployment Playbook

**Version**: 1.0.0
**Last Updated**: 2026-03-27
**Target Audience**: DevOps Engineers, Release Managers
**Reading Time**: 40 minutes

---

## Table of Contents

1. [Introduction](#introduction)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Strategies](#deployment-strategies)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Environment-Specific Configurations](#environment-specific-configurations)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Deployment Automation](#deployment-automation)
9. [Blue-Green Deployment](#blue-green-deployment)
10. [Canary Deployment](#canary-deployment)
11. [Emergency Rollback](#emergency-rollback)
12. [Deployment Best Practices](#deployment-best-practices)

---

## Introduction

This deployment playbook provides standardized procedures for deploying OmniClaw Enhanced cloud functions to Google Cloud Platform. Follow these procedures to ensure safe, reliable, and repeatable deployments.

### Deployment Goals

- **Zero Downtime**: No service interruption during deployment
- **Fast Rollback**: Ability to revert within 5 minutes
- **Safe Rollout**: Gradual traffic shift with monitoring
- **Automation**: Minimize manual intervention
- **Traceability**: Complete audit trail of all deployments

### Deployment Types

| Type | Purpose | Risk Level | Duration |
|------|---------|------------|----------|
| **Feature Deployment** | New functionality | Medium | 15-30 minutes |
| **Bug Fix Deployment** | Critical fixes | Low | 10-15 minutes |
| **Emergency Deployment** | Hotfix for production issues | High | 5-10 minutes |
| **Infrastructure Update** | Dependency/runtime updates | High | 30-60 minutes |

---

## Pre-Deployment Checklist

### Phase 1: Code Readiness

```bash
# 1. Ensure all tests pass
npm run test:all

# Expected output:
# Test Suites: 20 passed, 20 total
# Tests:       150 passed, 150 total
# Coverage:    95% statements, 93% branches, 94% functions, 94% lines

# 2. Run linting
npm run lint

# Expected: No errors, warnings ≤ 5

# 3. Check code formatting
npm run format:check

# Expected: No formatting issues

# 4. Security audit
npm audit --production

# Expected: No high/critical vulnerabilities
```

### Phase 2: Documentation

- [ ] API documentation updated (`API_DOCUMENTATION.md`)
- [ ] Changelog updated (`CHANGELOG.md`)
- [ ] Migration guide created (if breaking changes)
- [ ] Rollback plan documented

### Phase 3: Testing

```bash
# 1. Run unit tests
npm run test:unit

# 2. Run integration tests
npm run test:integration

# 3. Run E2E tests against staging
npm run test:smoke:staging

# 4. Run performance tests
npm run test:performance
```

### Phase 4: Environment Preparation

```bash
# 1. Verify environment variables
cat .env.production

# Required variables:
# - PROJECT_ID
# - FIRESTORE_PROJECT
# - ANTHROPIC_API_KEY
# - ELEVENLABS_API_KEY
# - SPOTIFY_CLIENT_ID
# - SPOTIFY_CLIENT_SECRET
# - YOUTUBE_API_KEY

# 2. Check secrets are set
gcloud secrets list --filter="name:(anthropic|elevenlabs|spotify|youtube)"

# 3. Verify IAM permissions
gcloud projects get-iam-policy omniclaw-enhanced \
  --filter="bindings.role:roles/cloudfunctions.developer"
```

### Phase 5: Backup

```bash
# 1. Backup Firestore data
gcloud firestore export gs://omniclaw-backups/pre-deployment-$(date +%Y%m%d-%H%M%S)

# 2. Backup current deployment
git tag -a pre-deployment-$(date +%Y%m%d) -m "Pre-deployment backup"

# 3. Document current version
gcloud functions list --regions=us-central1 --format="json" > deployment-backup.json
```

### Phase 6: Notifications

```bash
# 1. Create deployment issue
# GitHub: New Issue → Deployment: [Version] to Production

# 2. Notify team
# Slack: #deployments channel
# Message: "🚀 Deploying v1.2.0 to production in 15 minutes"

# 3. Schedule maintenance window (if required)
# Only for infrastructure updates or breaking changes
```

---

## Deployment Strategies

### Strategy 1: All-at-Once (Default)

**Use Case**: Low-traffic periods, small changes

**Process**:
```
1. Deploy all functions simultaneously
2. Wait for health checks
3. Verify functionality
4. Complete deployment
```

**Pros**:
- Fastest deployment time
- Simple to execute
- Easy to understand

**Cons**:
- Higher risk (all functions updated at once)
- Potential for complete outage
- Harder to pinpoint issues

### Strategy 2: Rolling Deployment

**Use Case**: High-traffic periods, critical services

**Process**:
```
1. Deploy non-critical functions first
   - omniclaw-analytics
   - omniclaw-health

2. Deploy medium-critical functions
   - omniclaw-price
   - omniclaw-media

3. Deploy critical functions last
   - omniclaw-story
   - omniclaw-email
```

**Pros**:
- Reduced risk
- Can stop if issues detected
- Easier to rollback specific functions

**Cons**:
- Longer deployment time
- More complex coordination
- Potential version mismatch during rollout

### Strategy 3: Blue-Green Deployment

**Use Case**: Major version updates, infrastructure changes

**Process**:
```
1. Deploy to green environment
2. Test green environment thoroughly
3. Switch traffic from blue to green
4. Monitor for issues
5. Keep blue for rollback capability
```

**Pros**:
- Zero downtime
- Instant rollback capability
- Thorough testing before cutover

**Cons**:
- Higher cost (double infrastructure)
- More complex setup
- Requires traffic management

### Strategy 4: Canary Deployment

**Use Case**: Experimental features, uncertain impact

**Process**:
```
1. Deploy new version to small percentage of traffic
2. Monitor metrics closely
3. Gradually increase traffic
4. Full rollout or rollback based on metrics
```

**Pros**:
- Minimizes blast radius
- Data-driven decision making
- Early issue detection

**Cons**:
- Complex to implement
- Requires sophisticated traffic splitting
- Longer deployment process

---

## Step-by-Step Deployment

### Phase 1: Preparation (5 minutes)

```bash
# 1. Create deployment branch
git checkout -b deploy/v1.2.0

# 2. Verify branch is up to date
git pull origin main

# 3. Set deployment environment
export DEPLOY_ENV=production
export DEPLOY_REGION=us-central1
export DEPLOY_PROJECT=omniclaw-enhanced

# 4. Verify current production version
gcloud functions list --regions=us-central1 --format="table(name,status,version,updateTime)"
```

### Phase 2: Build & Test (5 minutes)

```bash
# 1. Clean previous builds
npm run clean

# 2. Install dependencies
npm install

# 3. Run tests
npm run test:all

# 4. Build deployment packages
npm run build

# 5. Verify build artifacts
ls -lh deploy/functions/
```

### Phase 3: Deploy Functions (15 minutes)

#### Option A: Automated Deployment

```bash
# Deploy all functions
npm run deploy:all

# Script will:
# 1. Deploy omniclaw-health (first)
# 2. Deploy omniclaw-analytics
# 3. Deploy omniclaw-price
# 4. Deploy omniclaw-media
# 5. Deploy omniclaw-story
# 6. Deploy omniclaw-email (last)

# Wait for health checks between deployments
```

#### Option B: Manual Deployment (Controlled)

```bash
# 1. Deploy health function first
npm run deploy:health

# Wait for deployment to complete
sleep 30

# 2. Test health function
curl -f "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-health/health"

# 3. Deploy analytics
npm run deploy:analytics
sleep 30

# 4. Deploy price tracking
npm run deploy:price
sleep 30

# 5. Deploy media control
npm run deploy:media
sleep 30

# 6. Deploy story generation
npm run deploy:story
sleep 30

# 7. Deploy email intelligence
npm run deploy:email
```

### Phase 4: Verification (10 minutes)

```bash
# 1. Run smoke tests
npm run test:smoke:production

# 2. Check function health
for func in omniclaw-price omniclaw-story omniclaw-media; do
  echo "Testing $func..."
  curl -f "https://us-central1-omniclaw-enhanced.cloudfunctions.net/$func/health"
done

# 3. Check error logs
gcloud logging read \
  "resource.type=cloud_function AND severity>=ERROR" \
  --limit=20 --freshness=5m

# 4. Monitor metrics
gcloud alpha monitoring time-series-list \
  --filter="resource.type=cloud_function" \
  --period=5m
```

### Phase 5: Documentation (5 minutes)

```bash
# 1. Tag deployment
git tag -a v1.2.0 -m "Release v1.2.0: Add price alerts"
git push origin v1.2.0

# 2. Update CHANGELOG.md
cat >> CHANGELOG.md << EOF
## [1.2.0] - 2026-03-27
### Added
- Price alert notifications
- Email integration for price drops

### Fixed
- Timeout issues in story generation
- CORS errors in media control

### Changed
- Upgraded to Node.js 22
- Updated dependencies
EOF

# 3. Commit deployment record
git add CHANGELOG.md
git commit -m "docs: record deployment v1.2.0"
git push origin main

# 4. Notify team
# Slack: "✅ Deployment v1.2.0 completed successfully"
```

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

```bash
# 1. Identify previous stable version
git tag --sort=-creatordate | head -5

# 2. Checkout previous version
git checkout v1.1.0

# 3. Redeploy specific function
npm run deploy:story

# 4. Verify rollback
curl -f "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story/health"

# 5. Monitor for issues
gcloud logging tail "resource.labels.function_name=omniclaw-story"
```

### Automated Rollback Script

```bash
#!/bin/bash
# rollback.sh

FUNCTION=$1
VERSION=${2:-"previous"}

if [ -z "$FUNCTION" ]; then
  echo "Usage: ./rollback.sh <function-name> [version]"
  exit 1
fi

echo "🔄 Rolling back $FUNCTION to $VERSION"

# Get previous version
if [ "$VERSION" = "previous" ]; then
  PREVIOUS_TAG=$(git tag --sort=-creatordate | sed -n '2p')
  VERSION=$PREVIOUS_TAG
fi

# Checkout previous version
git checkout $VERSION

# Redeploy function
echo "📦 Redeploying $FUNCTION..."
npm run deploy:$FUNCTION

# Wait for deployment
sleep 30

# Verify rollback
echo "✅ Verifying rollback..."
curl -f "https://us-central1-omniclaw-enhanced.cloudfunctions.net/$FUNCTION/health"

if [ $? -eq 0 ]; then
  echo "✅ Rollback successful"
else
  echo "❌ Rollback failed"
  exit 1
fi

# Notify team
echo "📢 Notifying team..."
# Send Slack notification

echo "✅ Rollback complete!"
```

### Full System Rollback

```bash
# 1. Rollback all functions
./rollback.sh omniclaw-health v1.1.0
./rollback.sh omniclaw-analytics v1.1.0
./rollback.sh omniclaw-price v1.1.0
./rollback.sh omniclaw-media v1.1.0
./rollback.sh omniclaw-story v1.1.0
./rollback.sh omniclaw-email v1.1.0

# 2. Restore database if needed
gcloud firestore import gs://omniclaw-backups/backup-20260326

# 3. Verify all functions
npm run test:smoke:production
```

---

## Environment-Specific Configurations

### Development Environment

```yaml
# .env.development
PROJECT_ID=omniclaw-enhanced-dev
FIRESTORE_PROJECT=omniclaw-enhanced-dev
REGION=us-central1

# Use development API keys
ANTHROPIC_API_KEY=dev_key
ELEVENLABS_API_KEY=dev_key

# Local emulators
FIRESTORE_EMULATOR_HOST=localhost:8080
REDIS_URL=redis://localhost:6379

# Feature flags
ENABLE_EXPERIMENTAL_FEATURES=true
LOG_LEVEL=debug
```

### Staging Environment

```yaml
# .env.staging
PROJECT_ID=omniclaw-enhanced-staging
FIRESTORE_PROJECT=omniclaw-enhanced-staging
REGION=us-central1

# Production API keys (with limits)
ANTHROPIC_API_KEY=staging_key
ELEVENLABS_API_KEY=staging_key

# Cloud services
REDIS_URL=rediss://redis-staging:6379

# Feature flags
ENABLE_EXPERIMENTAL_FEATURES=false
LOG_LEVEL=info
```

### Production Environment

```yaml
# .env.production
PROJECT_ID=omniclaw-enhanced
FIRESTORE_PROJECT=omniclaw-enhanced
REGION=us-central1

# Production API keys (full access)
ANTHROPIC_API_KEY=prod_key
ELEVENLABS_API_KEY=prod_key
SPOTIFY_CLIENT_ID=prod_client_id
SPOTIFY_CLIENT_SECRET=prod_client_secret
YOUTUBE_API_KEY=prod_key

# Cloud services
REDIS_URL=rediss://redis-prod:6379

# Feature flags
ENABLE_EXPERIMENTAL_FEATURES=false
LOG_LEVEL=warn
```

---

## Post-Deployment Verification

### Automated Verification Script

```bash
#!/bin/bash
# verify-deployment.sh

echo "🔍 Verifying deployment..."

# 1. Health checks
echo "🏥 Running health checks..."
for func in omniclaw-price omniclaw-story omniclaw-media omniclaw-analytics omniclaw-health omniclaw-email; do
  echo -n "Checking $func... "
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://us-central1-omniclaw-enhanced.cloudfunctions.net/$func/health")

  if [ "$status" = "200" ]; then
    echo "✅"
  else
    echo "❌ (HTTP $status)"
    exit 1
  fi
done

# 2. Functional tests
echo "🧪 Running functional tests..."

# Test price tracking
echo -n "Testing price tracking... "
response=$(curl -s -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "getTracked", "userId": "test-user"}')
if echo "$response" | grep -q '"success":true'; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

# Test story generation
echo -n "Testing story TTS... "
response=$(curl -s -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "textToSpeech", "params": {"text": "Test", "character": "narrator"}}')
if echo "$response" | grep -q '"success":true'; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

# Test media control
echo -n "Testing media search... "
response=$(curl -s -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media" \
  -H 'Content-Type: application/json' \
  -d '{"requestType": "search", "platform": "spotify", "params": {"query": "test"}}')
if echo "$response" | grep -q '"success":true'; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

# 3. Error rate check
echo "📊 Checking error rates..."
errors=$(gcloud logging read \
  "resource.type=cloud_function AND severity>=ERROR" \
  --limit=100 --freshness=10m --format="value(severity)" | wc -l)

if [ "$errors" -lt 5 ]; then
  echo "✅ Error rate acceptable ($errors errors in 10 minutes)"
else
  echo "❌ High error rate ($errors errors in 10 minutes)"
  exit 1
fi

# 4. Performance check
echo "⏱️  Checking performance..."
latency=$(gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.latency" \
  --limit=100 --freshness=10m --format="value(jsonPayload.latency)" | \
  awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')

if (( $(echo "$latency < 5000" | bc -l) )); then
  echo "✅ Average latency: ${latency}ms"
else
  echo "❌ High latency: ${latency}ms"
  exit 1
fi

echo ""
echo "✅ All verifications passed!"
echo "🎉 Deployment successful!"
```

### Manual Verification Checklist

```markdown
## Post-Deployment Checklist

### Health Checks
- [ ] omniclaw-health returns 200
- [ ] omniclaw-price returns 200
- [ ] omniclaw-story returns 200
- [ ] omniclaw-media returns 200
- [ ] omniclaw-analytics returns 200
- [ ] omniclaw-email returns 200

### Functional Tests
- [ ] Price tracking: Add product works
- [ ] Price tracking: Get tracked works
- [ ] Story generation: TTS works
- [ ] Story generation: Generate story works
- [ ] Media control: Spotify search works
- [ ] Media control: YouTube search works

### Performance Checks
- [ ] Average latency < 5s
- [ ] P95 latency < 10s
- [ ] Error rate < 1%
- [ ] No circuit breaker issues

### Monitoring
- [ ] Check Cloud Logging for errors
- [ ] Check Cloud Monitoring metrics
- [ ] Verify no budget alerts
- [ ] Check external API quotas

### Documentation
- [ ] Update CHANGELOG.md
- [ ] Tag release in Git
- [ ] Notify team of deployment
- [ ] Update deployment dashboard
```

---

## Deployment Automation

### CI/CD Pipeline Configuration

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm run test:all

      - name: Run linting
        run: npm run lint

      - name: Security audit
        run: npm audit --production

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Functions
        run: |
          gcloud functions deploy omniclaw-price --gen2 --region=us-central1
          gcloud functions deploy omniclaw-story --gen2 --region=us-central1
          gcloud functions deploy omniclaw-media --gen2 --region=us-central1

      - name: Run smoke tests
        run: npm run test:smoke:production

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Automated Deployment Script

```bash
#!/bin/bash
# deploy-all.sh

set -e  # Exit on error

DEPLOY_ENV=${1:-production}
REGION=us-central1
PROJECT=omniclaw-enhanced

echo "🚀 Deploying OmniClaw Enhanced to $DEPLOY_ENV..."

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."
npm run test:all
npm run lint

# Backup current state
echo "💾 Backing up current state..."
BACKUP_NAME="pre-deployment-$(date +%Y%m%d-%H%M%S)"
gcloud firestore export gs://omniclaw-backups/$BACKUP_NAME

# Deploy functions
echo "📦 Deploying functions..."
functions=(
  "omniclaw-health"
  "omniclaw-analytics"
  "omniclaw-price"
  "omniclaw-media"
  "omniclaw-story"
  "omniclaw-email"
)

for func in "${functions[@]}"; do
  echo "Deploying $func..."
  npm run deploy:${func}
  sleep 10

  # Health check
  if ! curl -f "https://$REGION-$PROJECT.cloudfunctions.net/$func/health"; then
    echo "❌ Health check failed for $func"
    exit 1
  fi
  echo "✅ $func deployed successfully"
done

# Post-deployment verification
echo "🔍 Running post-deployment verification..."
./verify-deployment.sh

# Tag release
VERSION=$(node -p "require('./package.json').version")
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

echo "✅ Deployment complete!"
```

---

## Blue-Green Deployment

### Implementation

```bash
# 1. Deploy to green environment
export DEPLOY_ENV=green

# Update Cloud Functions URLs
sed -i 's/us-central1-omniclaw-enhanced/us-central1-omniclaw-enhanced-green/g' package.json

# Deploy all functions to green
npm run deploy:all

# 2. Test green environment thoroughly
npm run test:smoke:green

# 3. Switch traffic using Cloud Load Balancer
gcloud compute url-maps import omniclaw-lb --source=lb-config-green.yaml

# 4. Monitor green environment
watch -n 5 'curl -s https://omniclaw-green.app/health | jq'

# 5. If successful, keep blue for rollback
# 6. After monitoring period (24h), delete blue
```

### Load Balancer Configuration

```yaml
# lb-config-green.yaml
defaultService: projects/omniclaw-enhanced/regions/us-central1/backendServices/omniclaw-green

hostRules:
  - hosts:
      - omniclaw.app
    pathMatcher: path-matcher-1

pathMatchers:
  - name: path-matcher-1
    defaultService: projects/omniclaw-enhanced/regions/us-central1/backendServices/omniclaw-green
    routeRules:
      - matchRules:
          - prefixMatch: /
        service: projects/omniclaw-enhanced/regions/us-central1/backendServices/omniclaw-green
```

---

## Canary Deployment

### Implementation

```bash
# 1. Deploy canary version (10% traffic)
gcloud functions deploy omniclaw-story-canary \
  --gen2 \
  --region=us-central1 \
  --traffic-split=omniclaw-story=90,omniclaw-story-canary=10

# 2. Monitor canary metrics
watch -n 10 'gcloud logging read "resource.labels.function_name=omniclaw-story-canary AND severity>=ERROR" --limit=10 --freshness=1m'

# 3. Gradually increase traffic
gcloud functions deploy omniclaw-story-canary \
  --traffic-split=omniclaw-story=70,omniclaw-story-canary=30

# 4. If metrics are good, full rollout
gcloud functions deploy omniclaw-story \
  --gen2 \
  --region=us-central1

# 5. Remove canary
gcloud functions delete omniclaw-story-canary
```

---

## Emergency Rollback

### Procedure

```bash
# 1. Immediate rollback (use if critical issues detected)
./rollback.sh omniclaw-story v1.1.0

# 2. Verify rollback
npm run test:smoke:production

# 3. Monitor for stability
gcloud logging tail "resource.labels.function_name=omniclaw-story"

# 4. If rollback fails, escalate to emergency procedures
# 5. Create incident report
# 6. Schedule post-mortem
```

### Rollback Decision Matrix

| Condition | Action | Timeframe |
|-----------|--------|-----------|
| Error rate > 5% | Immediate rollback | < 2 minutes |
| P95 latency > 30s | Rollback | < 5 minutes |
| Circuit breaker open | Investigate, rollback if needed | < 10 minutes |
| User complaints > 10 | Rollback | < 5 minutes |
| Data corruption | Emergency rollback + data restore | < 15 minutes |

---

## Deployment Best Practices

### 1. Deployment Timing

```bash
# Deploy during low-traffic periods
# Best times: 2-4 AM EST, Sunday mornings

# Check current traffic before deploying
gcloud alpha monitoring time-series-list \
  --filter="resource.type=cloud_function" \
  --period=1h

# Schedule deployment for low traffic
echo "0 3 * * 0 /path/to/deploy.sh" | crontab -
```

### 2. Gradual Rollout

```bash
# Deploy in phases
# Phase 1: Internal team (5% traffic)
# Phase 2: Beta users (20% traffic)
# Phase 3: Full rollout (100% traffic)
```

### 3. Monitoring During Deployment

```bash
# Real-time monitoring
gcloud logging tail "resource.type=cloud_function" \
  --filter="severity>=ERROR" &
TAIL_PID=$!

# Deploy functions
npm run deploy:story

# Check for errors
sleep 60
if ps -p $TAIL_PID > /dev/null; then
  echo "No errors detected in first minute"
else
  echo "Errors detected, rollback initiated"
  ./rollback.sh omniclaw-story
fi

kill $TAIL_PID
```

### 4. Documentation

```bash
# Always document deployments
cat >> deployment-log.txt << EOF
$(date): Deployed v1.2.0
Changes: Added price alerts, fixed TTS timeout
Deployed by: $USER
Rollback version: v1.1.0
EOF
```

### 5. Post-Deployment Review

```markdown
# Deployment Review Template

## Deployment Summary
- **Version**: v1.2.0
- **Date**: 2026-03-27
- **Time**: 03:00 AM EST
- **Duration**: 25 minutes

## Changes
- Added price alert notifications
- Fixed TTS timeout issues
- Updated dependencies

## Metrics
- Error rate: 0.05% (target: < 1%)
- P95 latency: 3.2s (target: < 5s)
- Availability: 100% (target: > 99.9%)

## Issues
- Minor: Two timeout errors during deployment (resolved)

## Lessons Learned
- Ensure all API keys are rotated before deployment
- Add more thorough pre-deployment testing

## Next Steps
- Monitor for 24 hours
- Schedule post-mortem for timeout issues
```

---

## Appendix

### A. Deployment Commands Reference

```bash
# List all deployments
gcloud functions list --regions=us-central1

# Get function details
gcloud functions describe omniclaw-story --region=us-central1

# View function logs
gcloud functions logs read omniclaw-story --region=us-central1 --limit 50

# Delete function
gcloud functions delete omniclaw-story --region=us-central1

# Get function URL
gcloud functions describe omniclaw-story --region=us-central1 --format="value(httpsTrigger.url)")
```

### B. Useful Scripts

```bash
# Monitor deployment in real-time
#!/bin/bash
# monitor-deployment.sh

while true; do
  clear
  echo "📊 Deployment Status - $(date)"
  echo "================================"

  # Check function status
  for func in omniclaw-price omniclaw-story omniclaw-media; do
    status=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://us-central1-omniclaw-enhanced.cloudfunctions.net/$func/health")

    if [ "$status" = "200" ]; then
      echo "✅ $func: Healthy"
    else
      echo "❌ $func: Unhealthy (HTTP $status)"
    fi
  done

  echo ""
  echo "📈 Recent Errors:"
  gcloud logging read \
    "resource.type=cloud_function AND severity>=ERROR" \
    --limit=5 --freshness=5m --format="table(timestamp,jsonPayload.error,resource.labels.function_name)"

  sleep 10
done
```

### C. Contact Information

- **On-Call Engineer**: [Phone/Slack]
- **DevOps Team**: [Email]
- **Engineering Manager**: [Email]

### D. Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Developer onboarding
- [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Operational runbook
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference

---

**Document Version**: 1.0.0
**Last Updated**: 2026-03-27
**Maintained By**: OmniClaw DevOps Team
**Next Review**: 2026-04-27
