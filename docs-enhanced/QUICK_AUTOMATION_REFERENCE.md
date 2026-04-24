# OmniClaw Enhanced - Deployment Automation Quick Reference

**Last Updated**: 2026-03-27
**Status**: ✅ Production Ready

---

## 🚀 Quick Start

### First-Time Deployment
```bash
cd /Users/Subho/omniclaw-enhanced
./deploy-all.sh production
```

### With Monitoring
```bash
./setup-monitoring.sh --notification-channel=your-email@example.com
```

---

## 📜 Script Locations

| Script | Location | Size | Status |
|--------|----------|------|--------|
| Master Deployment | `/Users/Subho/omniclaw-enhanced/deploy-all.sh` | 23KB | ✅ Executable |
| Rollback | `/Users/Subho/omniclaw-enhanced/rollback.sh` | 20KB | ✅ Executable |
| Monitoring Setup | `/Users/Subho/omniclaw-enhanced/setup-monitoring.sh` | 25KB | ✅ Executable |

---

## 🎯 Common Commands

### Deploy All (Infrastructure + Secrets + Functions)
```bash
./deploy-all.sh production
```

### Deploy Functions Only (Faster)
```bash
./deploy-all.sh production --skip-infra --skip-secrets
```

### Deploy with Verbose Output
```bash
./deploy-all.sh production --verbose
```

### Dry Run (Test Without Changes)
```bash
./deploy-all.sh production --dry-run
```

---

## 🔄 Rollback Commands

### Rollback Functions to Previous Version
```bash
./rollback.sh functions
```

### Rollback to Specific Version
```bash
./rollback.sh functions --version 5
```

### Remove All Scheduler Jobs
```bash
./rollback.sh scheduler
```

### Remove All Cloud Tasks Queues
```bash
./rollback.sh queues
```

### Complete Rollback (Everything Except Secrets)
```bash
./rollback.sh all --force
```

---

## 📊 Monitoring Commands

### Setup Complete Monitoring
```bash
./setup-monitoring.sh
```

### Setup with Email Alerts
```bash
./setup-monitoring.sh --notification-channel=ops@example.com
```

### Skip Dashboard Creation
```bash
./setup-monitoring.sh --skip-dashboard
```

### Skip Uptime Checks
```bash
./setup-monitoring.sh --skip-uptime
```

---

## 🔧 Useful Options

### Common Flags (All Scripts)
- `--dry-run` - Show what would be done without executing
- `--verbose` - Enable detailed output
- `-h, --help` - Show help message

### Deployment-Specific
- `--skip-infra` - Skip infrastructure setup
- `--skip-secrets` - Skip secret creation
- `--skip-functions` - Skip function deployment
- `--skip-tests` - Skip post-deployment tests

### Rollback-Specific
- `--version N` - Rollback to specific version
- `--force` - Skip confirmation prompts
- `--keep-secrets` - Keep secrets during rollback

### Monitoring-Specific
- `--skip-dashboard` - Skip dashboard creation
- `--skip-alerts` - Skip alert policy creation
- `--skip-logs` - Skip log sink setup
- `--skip-uptime` - Skip uptime check setup
- `--notification-channel=EMAIL` - Set alert notification

---

## 📝 Environment Setup

### Required Environment Variables
```bash
export PROJECT_ID=omniclaw-enhanced
export REGION=us-central1
```

### Available Environments
- `development` - Development environment
- `staging` - Staging environment
- `production` - Production environment (default)

---

## 📁 Log Files

### Deployment Logs
```bash
/tmp/omniclaw-deployment-[timestamp].log
```

### Rollback Logs
```bash
/tmp/omniclaw-rollback-[timestamp].log
```

### Monitoring Logs
```bash
/tmp/omniclaw-monitoring-[timestamp].log
```

---

## 🌐 Cloud Console URLs

### Cloud Monitoring Dashboard
```
https://console.cloud.google.com/monitoring?project=omniclaw-enhanced
```

### Cloud Logs Viewer
```
https://console.cloud.google.com/logs?project=omniclaw-enhanced
```

### Cloud Functions List
```
https://console.cloud.google.com/functions/list?project=omniclaw-enhanced
```

### Secret Manager
```
https://console.cloud.google.com/security/secrets?project=omniclaw-enhanced
```

---

## ✅ Verification Commands

### Check Deployment Status
```bash
./verify_deployment.sh
```

### Run Test Suite
```bash
./run-tests.sh
```

### List Deployed Functions
```bash
gcloud functions list --regions=us-central1 --format="table(name,status,updateTime)"
```

### List Scheduler Jobs
```bash
gcloud scheduler jobs list --project=omniclaw-enhanced
```

### List Cloud Tasks Queues
```bash
gcloud tasks queues list --project=omniclaw-enhanced --location=us-central1
```

---

## 🎨 Script Features

### Colored Output
- 🟢 **Green** - Success messages
- 🔵 **Blue** - Information
- 🟡 **Yellow** - Warnings
- 🔴 **Red** - Errors
- 🟣 **Purple** - Step indicators
- 🔵 **Cyan** - Headers

### Safety Features
- ✅ Idempotent operations (safe to run multiple times)
- ✅ Confirmation prompts for destructive actions
- ✅ Dry-run mode for testing
- ✅ Comprehensive error handling
- ✅ Detailed logging to files

---

## 🚨 Emergency Procedures

### Quick Rollback
```bash
./rollback.sh functions --force
```

### Complete Rollback
```bash
./rollback.sh all --keep-secrets --force
```

### Check Function Health
```bash
curl https://<region>-<project>.cloudfunctions.net/omniclaw-price/health
```

---

## 📚 Additional Documentation

- `DEPLOYMENT_AUTOMATION_COMPLETE.md` - Complete documentation
- `API_DOCUMENTATION.md` - API reference
- `DEPLOYMENT_AUTOMATION_GUIDE.md` - Detailed guide
- `SECRETS_MANAGEMENT_GUIDE.md` - Secret management
- `README.md` - Project overview

---

## 🎯 Typical Workflow

### Initial Deployment
```bash
# 1. Deploy everything
./deploy-all.sh production

# 2. Setup monitoring
./setup-monitoring.sh --notification-channel=ops@example.com

# 3. Verify deployment
./verify_deployment.sh

# 4. Run tests
./run-tests.sh
```

### Update Deployment
```bash
# Deploy only functions (infrastructure already exists)
./deploy-all.sh production --skip-infra --skip-secrets
```

### Troubleshooting
```bash
# Check logs
tail -f /tmp/omniclaw-deployment-*.log

# Verify health
./verify_deployment.sh

# If needed, rollback
./rollback.sh functions
```

---

## 💡 Tips

1. **Always use `--dry-run` first** to see what will happen
2. **Use `--verbose`** for debugging issues
3. **Keep the `--keep-secrets` flag** during rollback to avoid losing credentials
4. **Check log files** in `/tmp` for detailed execution history
5. **Run `./verify_deployment.sh`** after deployment to confirm success

---

**Total Script Lines**: ~2,200 lines of production-ready bash automation
**Validation**: ✅ All scripts pass syntax validation
**Status**: ✅ Production Ready

---

*Created: 2026-03-27*
*Version: 1.0.0*
