# OmniClaw Enhanced - CI/CD Pipeline Setup Guide

Complete guide for setting up and using the GitHub Actions CI/CD pipeline for OmniClaw Enhanced.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Secrets Configuration](#secrets-configuration)
5. [Deployment Environments](#deployment-environments)
6. [Usage Instructions](#usage-instructions)
7. [Monitoring and Rollback](#monitoring-and-rollback)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The CI/CD pipeline provides:

- **Automated Testing**: Run tests on every push and pull request
- **Staging Deployment**: Automatic deployment to staging on `develop` branch
- **Production Deployment**: Manual approval workflow for production
- **Health Checks**: Automated verification after deployment
- **Rollback Capability**: One-click rollback to previous versions
- **Notifications**: Slack/email alerts for deployment status

### Deployed Functions

The pipeline deploys three main functions:

1. **omniclaw-price** - Price tracking and analytics
2. **omniclaw-story** - Story narration and TTS
3. **omniclaw-media** - Media streaming and playback

---

## Prerequisites

### 1. Google Cloud Setup

```bash
# Create Google Cloud project (if not exists)
gcloud projects create omniclaw-enhanced

# Set as active project
gcloud config set project omniclaw-enhanced

# Enable required APIs
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions SA"

# Grant necessary permissions
gcloud projects add-iam-policy-binding omniclaw-enhanced \
  --member="serviceAccount:github-actions@omniclaw-enhanced.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.admin"

gcloud projects add-iam-policy-binding omniclaw-enhanced \
  --member="serviceAccount:github-actions@omniclaw-enhanced.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding omniclaw-enhanced \
  --member="serviceAccount:github-actions@omniclaw-enhanced.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Create and download service account key
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=github-actions@omniclaw-enhanced.iam.gserviceaccount.com
```

### 2. GitHub Repository Setup

```bash
# Enable GitHub Actions for repository
# Navigate to: https://github.com/YOUR_USERNAME/omniclaw-enhanced/settings/actions
# Click "Enable GitHub Actions"

# Add environments
# Navigate to: https://github.com/YOUR_USERNAME/omniclaw-enhanced/settings/environments

# Create "staging" environment
# - No protection rules needed

# Create "production" environment
# - Enable "Required reviewers"
# - Add your team as required reviewers
# - Enable "Wait timer" (optional, recommend 5 minutes)
```

---

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to any branch
- Pull requests to `main`, `develop`, `staging`

**Jobs:**
- Lint & Format Check
- Security Audit
- Unit Tests (with coverage)
- Integration Tests
- Build Verification
- Performance Tests (PRs only)

**Usage:**
```bash
# Automatic on push/PR
# View results: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions
```

### 2. Deploy to Staging (`.github/workflows/deploy-staging.yml`)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Jobs:**
- Pre-deployment checks
- Full test suite
- Deploy to staging (parallel deployment)
- Health checks
- Smoke tests
- Notifications

**Usage:**
```bash
# Automatic on push to develop
git checkout develop
git merge feature-branch
git push origin develop

# Manual trigger:
# Navigate to: Actions -> Deploy to Staging -> Run workflow
```

### 3. Deploy to Production (`.github/workflows/deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch
- Tagged releases

**Jobs:**
- Validation and approval
- Pre-deployment tests
- Backup current production
- Deploy to production (parallel deployment)
- Health checks
- Smoke tests
- Monitoring setup
- Notifications

**Usage:**
```bash
# Automatic on push to main (after approval)
git checkout main
git merge develop
git push origin main

# Then approve in GitHub Actions

# Manual trigger with version:
# Navigate to: Actions -> Deploy to Production -> Run workflow
# Enter version (e.g., v1.0.0)
# Request approval
# Wait for approval
# Automatic deployment
```

### 4. Rollback (`.github/workflows/rollback.yml`)

**Triggers:**
- Manual workflow dispatch only

**Jobs:**
- Validation and confirmation
- Pre-rollback checks
- Rollback functions (parallel)
- Post-rollback validation
- Incident management

**Usage:**
```bash
# Manual trigger:
# Navigate to: Actions -> Emergency Rollback -> Run workflow
# Select environment: production or staging
# Enter reason for rollback
# Type "ROLLBACK" to confirm
# Execute rollback
```

---

## Secrets Configuration

Navigate to: `https://github.com/YOUR_USERNAME/omniclaw-enhanced/settings/secrets/actions`

### Required Secrets

| Secret Name | Description | How to Generate |
|-------------|-------------|-----------------|
| `GCP_SA_KEY_STAGING` | GCP Service Account Key (Staging) | `cat gcp-sa-key-staging.json | base64` |
| `GCP_SA_KEY_PROD` | GCP Service Account Key (Production) | `cat gcp-sa-key-prod.json | base64` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | Slack App settings |
| `SMTP_SERVER` | SMTP server for notifications | Your email provider |
| `SMTP_PORT` | SMTP port (usually 587) | Your email provider |
| `SMTP_USERNAME` | SMTP username | Your email provider |
| `SMTP_PASSWORD` | SMTP password | Your email provider |
| `NOTIFICATION_EMAIL` | Email for deployment alerts | Your email address |

### Google Secret Manager Setup

```bash
# Create secrets for production
gcloud secrets create groq-api-key --data-file=- <<< "your-groq-api-key"
gcloud secrets create cerebras-api-key --data-file=- <<< "your-cerebras-api-key"
gcloud secrets create zai-api-key --data-file=- <<< "your-zai-api-key"
gcloud secrets create anthropic-api-key --data-file=- <<< "your-anthropic-api-key"
gcloud secrets create elevenlabs-api-key --data-file=- <<< "your-elevenlabs-api-key"
gcloud secrets create spotify-api-key --data-file=- <<< "your-spotify-api-key"

# Grant access to service account
gcloud secrets add-iam-policy-binding groq-api-key \
  --member="serviceAccount:github-actions@omniclaw-enhanced.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets...
```

---

## Deployment Environments

### Staging Environment

- **Branch**: `develop`
- **Region**: `us-central1`
- **URL**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net`
- **Auto-deploy**: Yes (on push to develop)
- **Instances**: 0-10 (min-max)

### Production Environment

- **Branch**: `main`
- **Region**: `us-central1`
- **URL**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net`
- **Auto-deploy**: No (requires manual approval)
- **Instances**: 0-100 (min-max)

---

## Usage Instructions

### Standard Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test locally
npm test
npm run lint

# 3. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 4. Create pull request
# CI will run automatically

# 5. After PR approval, merge to develop
# This triggers staging deployment

# 6. Test in staging
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health

# 7. Create PR from develop to main
# After approval, manual approval for production deployment

# 8. Approve production deployment in GitHub Actions
# Wait for health checks
# Verify production deployment
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Make changes
# ...

# 3. Push and create PR to main
git push origin hotfix/critical-fix

# 4. Merge PR after approval
# Triggers production deployment (after approval)

# 5. Remember to merge back to develop
git checkout develop
git merge hotfix/critical-fix
git push origin develop
```

### Manual Deployment

```bash
# Deploy to staging manually
# Navigate to: Actions -> Deploy to Staging -> Run workflow

# Deploy to production manually
# Navigate to: Actions -> Deploy to Production -> Run workflow
# Enter version: v1.0.0
# Request approval
# Wait for approval
```

---

## Monitoring and Rollback

### Monitoring Deployments

```bash
# Check deployment status in GitHub Actions
# https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions

# Check function status
gcloud functions list \
  --filter="name:omniclaw-*" \
  --format="table(name,status,updateTime)"

# View function logs
gcloud functions logs read omniclaw-price \
  --region=us-central1 \
  --limit=50

# Monitor function metrics
gcloud functions metrics list omniclaw-price \
  --region=us-central1
```

### Health Checks

```bash
# Run health checks
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story/health
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media/health

# Run local verification script
cd /Users/Subho/omniclaw-enhanced
./verify_deployment.sh production
```

### Rollback Procedure

**Option 1: Automatic Rollback**

If health checks fail during deployment, automatic rollback is triggered.

**Option 2: Manual Rollback via GitHub Actions**

```bash
# Navigate to: Actions -> Emergency Rollback -> Run workflow
# 1. Select environment: production
# 2. Enter reason: "Critical bug discovered"
# 3. Type "ROLLBACK" to confirm
# 4. Execute rollback
```

**Option 3: Manual Rollback via CLI**

```bash
# Rollback to previous commit
git log --oneline -5
# Copy the commit hash you want to rollback to

./rollback.sh production <commit-hash> "Critical bug"

# Or use gcloud directly
gcloud functions deploy omniclaw-price \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --source=./deploy/functions/omniclaw-price \
  --project=omniclaw-enhanced
```

---

## Troubleshooting

### Common Issues

#### 1. CI Pipeline Fails

**Problem**: Tests failing in CI but passing locally

**Solutions:**
```bash
# Check test environment
npm run test:ci

# Check for platform-specific issues
npm run test:all

# Review CI logs in GitHub Actions
```

#### 2. Deployment Fails

**Problem**: Function deployment fails

**Solutions:**
```bash
# Check function logs
gcloud functions logs read <function-name> \
  --region=us-central1 \
  --limit=100

# Verify secrets exist
gcloud secrets list

# Check service account permissions
gcloud projects get-iam-policy omniclaw-enhanced \
  --filter="serviceAccount:github-actions@"
```

#### 3. Health Checks Fail

**Problem**: Functions deployed but health checks fail

**Solutions:**
```bash
# Check if functions are responding
curl -v https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health

# Check function status
gcloud functions describe omniclaw-price \
  --region=us-central1

# View recent logs
gcloud functions logs read omniclaw-price \
  --region=us-central1 \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

#### 4. Rollback Issues

**Problem**: Rollback fails or doesn't fix the issue

**Solutions:**
```bash
# Verify previous commit is stable
git show <commit-hash>

# Check function backup
gcloud functions describe omniclaw-price \
  --region=us-central1 \
  --format=json

# Manual redeploy from previous commit
git checkout <commit-hash>
./deploy-all.sh
```

### Debug Mode

Enable debug logging in GitHub Actions:

```bash
# Add repository secret
# Actions secrets -> New repository secret
# Name: ACTIONS_STEP_DEBUG
# Value: true

# Re-run workflow with debug logs
```

### Get Help

```bash
# Check workflow status
gh workflow list

# View recent runs
gh run list --limit=10

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

---

## Best Practices

1. **Always test locally** before pushing
   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Use feature branches** for development
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Create PRs** instead of pushing directly to main/develop

4. **Test in staging** before production deployment

5. **Monitor deployments** after they complete

6. **Keep secrets secure** - never commit them

7. **Review logs** when deployments fail

8. **Document changes** in commit messages

9. **Tag releases** for production deployments
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

10. **Use rollback** if critical issues are found

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Project README](README.md)
- [API Documentation](API_DOCUMENTATION.md)

---

## Quick Reference

### Workflow Status
- CI: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/ci.yml
- Deploy Staging: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/deploy-staging.yml
- Deploy Production: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/deploy-production.yml
- Rollback: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/rollback.yml

### Function URLs
- Price: https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price
- Story: https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story
- Media: https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media

### Commands
```bash
# Deploy all
npm run deploy:all

# Deploy specific function
npm run deploy:price

# Run tests
npm test

# Verify deployment
./verify_deployment.sh production

# Rollback
./rollback.sh production <commit-hash> "reason"
```

---

**Last Updated**: 2026-03-27
**Version**: 1.0.0
**Maintained By**: OmniClaw Team
