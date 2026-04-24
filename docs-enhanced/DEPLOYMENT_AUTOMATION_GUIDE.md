# OmniClaw Enhanced - Deployment Automation Guide

**Last Updated:** 2026-03-27
**Version:** 1.0.0

This guide provides comprehensive documentation for the OmniClaw Enhanced deployment automation scripts.

---

## 📋 Overview

Three comprehensive automation scripts have been created to manage the complete lifecycle of OmniClaw Enhanced Cloud Functions:

1. **deploy-all.sh** - Master deployment script
2. **rollback.sh** - Rollback automation script
3. **setup-monitoring.sh** - Monitoring and alerting setup script

---

## 🚀 Script 1: Master Deployment (deploy-all.sh)

### Description
Complete end-to-end deployment automation for OmniClaw Enhanced Cloud Functions.

### Features
- ✅ Infrastructure setup (APIs, queues, jobs)
- ✅ Secret creation and verification
- ✅ Function deployment (all 3 functions)
- ✅ Post-deployment testing
- ✅ Health checks
- ✅ Error handling and validation
- ✅ Colored output and progress indicators
- ✅ Deployment logging
- ✅ Dry-run mode

### Usage

```bash
# Basic usage
./deploy-all.sh [environment]

# Examples
./deploy-all.sh production
./deploy-all.sh development
./deploy-all.sh staging

# With options
./deploy-all.sh production --skip-infra
./deploy-all.sh development --verbose
./deploy-all.sh staging --skip-tests --dry-run
```

### Options

| Option | Description |
|--------|-------------|
| `development` | Development environment (default) |
| `staging` | Staging environment |
| `production` | Production environment |
| `--skip-infra` | Skip infrastructure setup |
| `--skip-secrets` | Skip secret creation |
| `--skip-functions` | Skip function deployment |
| `--skip-tests` | Skip post-deployment tests |
| `--dry-run` | Show what would be done without executing |
| `--verbose` | Enable verbose output |
| `-h, --help` | Show help message |

### Environment Variables

```bash
# Project Configuration
export PROJECT_ID="omniclaw-enhanced"
export REGION="us-central1"

# Or set inline
PROJECT_ID=my-project REGION=us-east1 ./deploy-all.sh production
```

### What It Does

1. **Pre-flight Checks**
   - Verifies gcloud installation
   - Checks authentication
   - Validates project exists
   - Checks required directories

2. **Infrastructure Setup**
   - Enables required Google Cloud APIs
   - Creates Cloud Tasks queues
   - Creates Cloud Scheduler jobs

3. **Secret Management**
   - Reads from `.env.{environment}`
   - Creates/updates secrets in Secret Manager
   - Verifies secrets

4. **Function Deployment**
   - Deploys omniclaw-price
   - Deploys omniclaw-story
   - Deploys omniclaw-media
   - Configures memory, timeout, and secrets

5. **Post-Deployment Verification**
   - Tests health endpoints
   - Validates function URLs
   - Checks HTTP status codes

6. **Deployment Summary**
   - Shows deployment duration
   - Lists errors and warnings
   - Displays deployed resources
   - Provides access URLs

---

## 🔄 Script 2: Rollback Automation (rollback.sh)

### Description
Automated rollback capabilities for all OmniClaw Enhanced resources.

### Features
- ✅ Function rollback to previous versions
- ✅ Cloud Scheduler jobs removal
- ✅ Cloud Tasks queues removal
- ✅ Secret cleanup (optional)
- ✅ Version selection
- ✅ Confirmation prompts
- ✅ Dry-run mode
- ✅ Rollback logging

### Usage

```bash
# Basic usage
./rollback.sh [resource-type] [options]

# Examples
./rollback.sh functions --version 5
./rollback.sh scheduler --force
./rollback.sh queues
./rollback.sh all --dry-run
./rollback.sh secrets
```

### Resource Types

| Type | Description |
|------|-------------|
| `functions` | Rollback Cloud Functions to previous versions |
| `scheduler` | Remove Cloud Scheduler jobs |
| `queues` | Remove Cloud Tasks queues |
| `secrets` | Remove secrets from Secret Manager |
| `all` | Rollback everything (except secrets by default) |

### Options

| Option | Description |
|--------|-------------|
| `--version N` | Specific version to rollback to (for functions) |
| `--force` | Skip confirmation prompts |
| `--dry-run` | Show what would be done without executing |
| `--keep-secrets` | Keep secrets when rolling back 'all' |
| `-h, --help` | Show help message |

### Examples

```bash
# Rollback functions to version 5
./rollback.sh functions --version 5

# Remove all scheduler jobs (no confirmation)
./rollback.sh scheduler --force

# Remove all queues
./rollback.sh queues

# Full rollback (functions, scheduler, queues)
./rollback.sh all

# Full rollback including secrets
./rollback.sh all --force

# Dry run to see what would be rolled back
./rollback.sh all --dry-run
```

---

## 📊 Script 3: Monitoring Setup (setup-monitoring.sh)

### Description
Complete monitoring and alerting setup for OmniClaw Enhanced.

### Features
- ✅ Cloud Monitoring dashboards
- ✅ Alert policies (errors, latency, availability)
- ✅ Log sinks and metrics
- ✅ Uptime checks
- ✅ Custom metrics
- ✅ Notification channels
- ✅ Dry-run mode

### Usage

```bash
# Basic usage
./setup-monitoring.sh [options]

# Examples
./setup-monitoring.sh
./setup-monitoring.sh --notification-channel=your-email@example.com
./setup-monitoring.sh --skip-dashboard --dry-run
```

### Options

| Option | Description |
|--------|-------------|
| `--skip-dashboard` | Skip dashboard creation |
| `--skip-alerts` | Skip alert policy creation |
| `--skip-logs` | Skip log sink setup |
| `--skip-uptime` | Skip uptime check setup |
| `--notification-channel=EMAIL` | Email/PubSub channel for alerts |
| `--dry-run` | Show what would be done without executing |
| `--verbose` | Enable verbose output |
| `-h, --help` | Show help message |

### What It Sets Up

1. **Cloud Monitoring Dashboard**
   - Function invocation count
   - Execution latency (p99)
   - Error rate
   - Active instances
   - Memory usage
   - Network egress

2. **Alert Policies**
   - High error rate (> 5%)
   - High latency (> 30s)
   - Function not responding (no invocations in 5 minutes)

3. **Log Sinks**
   - Error log sink for Cloud Monitoring
   - Log-based metrics for errors

4. **Uptime Checks**
   - Health endpoint monitoring
   - Multi-region checks
   - 5-minute intervals

---

## 🎯 Common Workflows

### Initial Deployment

```bash
# 1. Deploy everything to production
./deploy-all.sh production

# 2. Set up monitoring
./setup-monitoring.sh --notification-channel=your-email@example.com

# 3. Verify deployment
gcloud functions list --regions=us-central1 --filter="name:omniclaw-*"
```

### Development Workflow

```bash
# 1. Deploy to development
./deploy-all.sh development --skip-infra --skip-secrets

# 2. Test functions
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health"

# 3. If issues found, rollback
./rollback.sh functions --version 2
```

### Production Rollback

```bash
# 1. Check current versions
gcloud functions versions list omniclaw-price --region=us-central1

# 2. Rollback to specific version
./rollback.sh functions --version 5

# 3. Verify rollback
./deploy-all.sh production --skip-infra --skip-secrets --skip-functions
```

### Monitoring Setup

```bash
# 1. Set up monitoring and alerts
./setup-monitoring.sh --notification-channel=alerts@example.com

# 2. Access dashboards
# https://console.cloud.google.com/monitoring?project=omniclaw-enhanced

# 3. View uptime checks
gcloud monitoring uptime-checks list --project=omniclaw-enhanced
```

### Clean Slate Rollback

```bash
# Remove everything (except secrets)
./rollback.sh all --force

# Remove everything including secrets
./rollback.sh all --force

# Then redeploy
./deploy-all.sh production
```

---

## 📁 Environment Files

### Required Files

```
omniclaw-enhanced/
├── .env.production          # Production environment variables
├── .env.staging            # Staging environment variables
├── .env.development        # Development environment variables
├── deploy/
│   ├── create-scheduler-jobs.sh
│   └── verify-secrets.sh
└── deploy/functions/
    ├── omniclaw-price/
    ├── omniclaw-story/
    └── omniclaw-media/
```

### Environment File Template

```bash
# Project Configuration
PROJECT_ID=omniclaw-enhanced
REGION=us-central1
ENVIRONMENT=production
NODE_ENV=production

# LLM Provider API Keys
ANTHROPIC_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
CEREBRAS_API_KEY=your-key-here
ZAI_API_KEY=your-key-here

# Database Configuration
FIRESTORE_PROJECT_ID=omniclaw-enhanced
REDIS_URL=redis://omniclaw-redis:6379

# Feature Flags
ENABLE_HALO_ORCHESTRATION=true
ENABLE_ANALYTICS=true
```

---

## 🔧 Troubleshooting

### Deployment Fails

```bash
# Check deployment logs
cat /tmp/omniclaw-deployment-*.log

# Run in verbose mode
./deploy-all.sh production --verbose

# Dry run to see what will happen
./deploy-all.sh production --dry-run
```

### Function Not Responding

```bash
# Check function status
gcloud functions describe omniclaw-price --region=us-central1

# Check logs
gcloud functions logs read omniclaw-price --region=us-central1 --limit=50

# Test health endpoint
curl -X POST "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health"
```

### Rollback Issues

```bash
# List available versions
gcloud functions versions list omniclaw-price --region=us-central1

# Rollback to previous version
./rollback.sh functions --version 2

# Full rollback
./rollback.sh all --force
```

### Monitoring Not Working

```bash
# Check if Monitoring API is enabled
gcloud services list --project=omniclaw-enhanced --filter="name:monitoring.googleapis.com"

# Enable Monitoring API
gcloud services enable monitoring.googleapis.com --project=omniclaw-enhanced

# Recreate monitoring
./setup-monitoring.sh
```

---

## 🔐 Security Considerations

### Secret Management

```bash
# List secrets
gcloud secrets list --project=omniclaw-enhanced

# View secret versions
gcloud secrets versions list production_groq-api-key --project=omniclaw-enhanced

# Never log secrets
# Scripts automatically exclude secrets from logs
```

### Access Control

```bash
# View who has access
gcloud functions get-iam-policy omniclaw-price --region=us-central1

# Grant access (if needed)
gcloud functions add-iam-policy-binding omniclaw-price \
  --region=us-central1 \
  --member=user:email@example.com \
  --role=roles/cloudfunctions.invoker
```

---

## 📈 Best Practices

### Before Deployment

1. **Test locally**
   ```bash
   npm test
   ```

2. **Use dry-run mode**
   ```bash
   ./deploy-all.sh production --dry-run
   ```

3. **Backup current version**
   ```bash
   gcloud functions versions list omniclaw-price --region=us-central1
   ```

### During Deployment

1. **Monitor logs**
   ```bash
   tail -f /tmp/omniclaw-deployment-*.log
   ```

2. **Check each stage**
   - Infrastructure setup
   - Secret creation
   - Function deployment
   - Health checks

### After Deployment

1. **Verify deployment**
   ```bash
   ./deploy-all.sh production --skip-infra --skip-secrets --skip-functions
   ```

2. **Monitor performance**
   - Check Cloud Monitoring dashboard
   - Review alert policies
   - Verify uptime checks

3. **Test functionality**
   - Health endpoints
   - Main API endpoints
   - Error handling

---

## 📞 Support

### Getting Help

```bash
# Show help for any script
./deploy-all.sh --help
./rollback.sh --help
./setup-monitoring.sh --help
```

### Useful Commands

```bash
# List all functions
gcloud functions list --regions=us-central1 --filter="name:omniclaw-*"

# List scheduler jobs
gcloud scheduler jobs list --project=omniclaw-enhanced

# List queues
gcloud tasks queues list --project=omniclaw-enhanced --location=us-central1

# View logs
gcloud functions logs read omniclaw-price --region=us-central1 --limit=100
```

---

## 📝 Summary

### Script Locations

- **Master Deployment:** `/Users/Subho/omniclaw-enhanced/deploy-all.sh` (23KB)
- **Rollback:** `/Users/Subho/omniclaw-enhanced/rollback.sh` (20KB)
- **Monitoring:** `/Users/Subho/omniclaw-enhanced/setup-monitoring.sh` (24KB)

### All Scripts Include

- ✅ Comprehensive error handling
- ✅ Colored output for better readability
- ✅ Progress indicators
- ✅ Logging to `/tmp/omniclaw-*.log`
- ✅ Dry-run mode for safe testing
- ✅ Idempotent operations (safe to run multiple times)
- ✅ Detailed help messages
- ✅ Usage examples

### Quick Start

```bash
# First time setup
./deploy-all.sh production
./setup-monitoring.sh --notification-channel=your-email@example.com

# Regular updates
./deploy-all.sh production --skip-infra --skip-secrets

# Emergency rollback
./rollback.sh all --force
```

---

**Created:** 2026-03-27
**Author:** OmniClaw Team
**Version:** 1.0.0
