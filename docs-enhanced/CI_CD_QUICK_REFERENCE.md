# OmniClaw Enhanced - CI/CD Quick Reference

Quick reference guide for the CI/CD pipeline.

## Quick Commands

### Local Development
```bash
# Run tests
npm test
npm run test:all
npm run test:unit
npm run test:integration

# Lint and format
npm run lint
npm run format:check
npm run format

# Deploy locally
npm run deploy:all
npm run deploy:price
npm run deploy:story
npm run deploy:media
```

### GitHub Actions

```bash
# View workflow runs
gh workflow list
gh run list --limit=10

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# Rerun workflow
gh run rerun <run-id>

# Cancel workflow
gh run cancel <run-id>
```

### Deployment

```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main
# Then approve in GitHub Actions

# Manual deployment
# Navigate to Actions -> Select workflow -> Run workflow
```

### Verification

```bash
# Health checks
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story/health
curl https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media/health

# Run verification script
./verify_deployment.sh production

# Run smoke tests
.github/scripts/run-smoke-tests.sh production
```

### Rollback

```bash
# Automatic rollback via GitHub Actions
# Navigate to Actions -> Emergency Rollback -> Run workflow

# Manual rollback via script
./rollback.sh production <commit-hash> "Critical bug"

# Manual rollback via gcloud
gcloud functions deploy omniclaw-price \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --source=./deploy/functions/omniclaw-price \
  --project=omniclaw-enhanced
```

## Workflow Triggers

### CI Workflow
- **Triggers**: Push to any branch, PR to main/develop/staging
- **Runs**: Lint, security audit, tests, build verification
- **Location**: `.github/workflows/ci.yml`

### Deploy to Staging
- **Triggers**: Push to `develop`, manual dispatch
- **Runs**: Tests, deploy, health checks, smoke tests
- **Location**: `.github/workflows/deploy-staging.yml`

### Deploy to Production
- **Triggers**: Push to `main`, manual dispatch, tagged releases
- **Requires**: Manual approval
- **Runs**: Tests, backup, deploy, health checks, monitoring
- **Location**: `.github/workflows/deploy-production.yml`

### Rollback
- **Triggers**: Manual dispatch only
- **Requires**: Type "ROLLBACK" to confirm
- **Runs**: Pre-rollback checks, rollback, validation, incident creation
- **Location**: `.github/workflows/rollback.yml`

## Environment URLs

### Staging
- **Base URL**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net`
- **Branch**: `develop`
- **Instances**: 0-10

### Production
- **Base URL**: `https://us-central1-omniclaw-enhanced.cloudfunctions.net`
- **Branch**: `main`
- **Instances**: 0-100

## Function Endpoints

### omniclaw-price
```
GET  /health                    - Health check
POST /api/track                 - Track product price
GET  /api/prices                - Get all prices
GET  /api/price/:id             - Get specific price
```

### omniclaw-story
```
GET  /health                    - Health check
POST /api/narrate               - Generate narration
GET  /api/voices                - Get available voices
POST /api/tts                   - Text-to-speech
```

### omniclaw-media
```
GET  /health                    - Health check
POST /api/stream                - Stream media
GET  /api/search                - Search media
POST /api/playlist              - Create playlist
```

## Secrets Management

### Required Secrets
```bash
# GCP Service Account Keys (base64 encoded)
GCP_SA_KEY_STAGING
GCP_SA_KEY_PROD

# Set secret
cat gcp-sa-key.json | base64 | gh secret set GCP_SA_KEY_STAGING
```

### Optional Secrets
```bash
# Slack Notifications
SLACK_WEBHOOK_URL

# Email Notifications
SMTP_SERVER
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
NOTIFICATION_EMAIL

# Set secret
echo "value" | gh secret set SECRET_NAME
```

### List Secrets
```bash
gh secret list
```

## Troubleshooting

### CI Failures
```bash
# Check logs
gh run view <run-id> --log

# Rerun failed tests
gh run rerun <run-id>

# Check locally
npm test
npm run lint
```

### Deployment Failures
```bash
# Check function logs
gcloud functions logs read <function-name> \
  --region=us-central1 \
  --limit=50

# Check function status
gcloud functions describe <function-name> \
  --region=us-central1

# Verify secrets
gcloud secrets list
```

### Health Check Failures
```bash
# Manual health check
curl -v https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health

# Check function status
gcloud functions list \
  --filter="name:omniclaw-*" \
  --format="table(name,status,updateTime)"

# Run verification
./verify_deployment.sh production
```

### Rollback Issues
```bash
# Verify previous commit
git show <commit-hash>

# Check function backups
gcloud functions describe <function-name> \
  --region=us-central1 \
  --format=json

# Manual redeploy
git checkout <commit-hash>
npm run deploy:all
```

## Best Practices

1. **Test Locally First**
   ```bash
   npm test
   npm run lint
   ```

2. **Use Feature Branches**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Create Pull Requests**
   - Never push directly to main/develop
   - Let CI run tests first
   - Review changes before merging

4. **Test in Staging**
   - Merge to develop first
   - Test in staging environment
   - Create PR from develop to main

5. **Monitor Deployments**
   - Watch GitHub Actions logs
   - Check function health
   - Verify in production

6. **Tag Releases**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

7. **Keep Secrets Secure**
   - Never commit secrets
   - Rotate keys regularly
   - Use GitHub Secrets

8. **Document Changes**
   - Use descriptive commit messages
   - Update CHANGELOG
   - Document breaking changes

## Emergency Procedures

### Critical Bug in Production
```bash
# 1. Immediate rollback
# Navigate to Actions -> Emergency Rollback
# Select: production
# Reason: "Critical bug - immediate rollback"
# Type: ROLLBACK
# Execute

# 2. Investigate
git log --oneline -10
git diff <commit-hash>

# 3. Fix and test
git checkout -b hotfix/critical-bug
# Make changes
npm test

# 4. Deploy fix
git push origin hotfix/critical-bug
# Create PR to main
# Merge after approval
# Approve production deployment

# 5. Verify
./verify_deployment.sh production
```

### Deployment Stuck
```bash
# 1. Check workflow status
gh run list --workflow=deploy-production.yml

# 2. Cancel if needed
gh run cancel <run-id>

# 3. Check function status
gcloud functions list --filter="name:omniclaw-*"

# 4. Redeploy if necessary
npm run deploy:all
```

### Health Check Failing
```bash
# 1. Check function logs
gcloud functions logs read omniclaw-price \
  --region=us-central1 \
  --limit=100

# 2. Test endpoint manually
curl -v https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health

# 3. Check secrets
gcloud secrets describe groq-api-key

# 4. Rollback if critical
./rollback.sh production <previous-commit> "Health check failing"
```

## Useful Links

- **GitHub Actions**: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions
- **CI Workflow**: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/ci.yml
- **Deploy Staging**: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/deploy-staging.yml
- **Deploy Production**: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/deploy-production.yml
- **Rollback**: https://github.com/YOUR_USERNAME/omniclaw-enhanced/actions/workflows/rollback.yml
- **GCP Console**: https://console.cloud.google.com/functions?project=omniclaw-enhanced
- **Setup Guide**: [CI_CD_SETUP_GUIDE.md](CI_CD_SETUP_GUIDE.md)

## Contact

For issues or questions:
- **GitHub Issues**: https://github.com/YOUR_USERNAME/omniclaw-enhanced/issues
- **Documentation**: [README.md](README.md)
- **API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

**Last Updated**: 2026-03-27
**Version**: 1.0.0
