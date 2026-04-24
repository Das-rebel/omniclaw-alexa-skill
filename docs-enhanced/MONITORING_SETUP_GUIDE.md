# OmniClaw Enhanced - Monitoring Setup Guide

Complete guide for setting up Cloud Monitoring dashboards, alerts, and uptime checks for OmniClaw Enhanced.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Dashboards](#dashboards)
5. [Alert Policies](#alert-policies)
6. [Uptime Checks](#uptime-checks)
7. [Notification Channels](#notification-channels)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Overview

OmniClaw Enhanced includes comprehensive monitoring setup with:

- **3 Custom Dashboards**: Overview, Price Tracking, Media Streaming
- **9 Alert Policies**: Covering errors, latency, and system health
- **7 Uptime Checks**: Monitoring all function endpoints
- **Multiple Notification Channels**: Email, Slack, PagerDuty

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Monitoring                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Overview    │  │ Price Track  │  │    Media     │      │
│  │  Dashboard   │  │   Dashboard  │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Alert Policies (9 total)                │  │
│  │  • Critical: Error rate > 5%, Latency > 3s          │  │
│  │  • Warning: Error rate > 1%, Latency > 2s           │  │
│  │  • Info: Cold starts, Memory usage                  │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Uptime Checks (7 total)                 │  │
│  │  • All function health endpoints                     │  │
│  │  • Multi-region monitoring (USA, Europe, Asia)       │  │
│  │  • Response time tracking                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Install jq for JSON processing
brew install jq  # macOS
# or
sudo apt-get install jq  # Ubuntu/Debian
```

### Authentication

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set active project
gcloud config set project omniclaw-enhanced

# Verify access
gcloud projects describe omniclaw-enhanced
```

### Required Roles

Ensure your account has the following roles:

- `roles/monitoring.viewer`
- `roles/monitoring.editor`
- `roles/cloudfunctions.viewer`
- `roles/cloudfunctions.developer`

```bash
# Check your permissions
gcloud projects get-iam-policy omniclaw-enhanced \
  --filter="bindings.members:user:$(gcloud config get-value account)"
```

## Quick Start

### 1. Clone and Navigate

```bash
cd /Users/Subho/omniclaw-enhanced/monitoring
```

### 2. Configure Notification Channels (Optional)

```bash
# Set environment variables for notification channels
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export PAGERDUTY_INTEGRATION_KEY="your-pagerduty-key"
export ALERT_EMAIL="alerts@yourdomain.com"
```

### 3. Deploy Monitoring

```bash
# Deploy everything (dashboards + alerts)
./deploy-dashboards.sh

# Deploy only dashboards
./deploy-dashboards.sh --dashboards-only

# Deploy only alerts
./deploy-dashboards.sh --alerts-only
```

### 4. Verify Deployment

```bash
# List dashboards
gcloud monitoring dashboards list --project=omniclaw-enhanced

# List alert policies
gcloud alpha monitoring policies list --project=omniclaw-enhanced

# List notification channels
gcloud monitoring channels list --project=omniclaw-enhanced
```

## Dashboards

### Overview Dashboard

**Location**: `monitoring/dashboards/overview-dashboard.json`

**Metrics**:
- Request rate (all functions)
- Error rate (with thresholds: 1%, 5%)
- P95 latency (with thresholds: 2s, 3s)
- Active instances
- Memory usage
- Network egress

**Widgets**:
- 6 scorecards with real-time metrics
- 3 time series tables showing function-level breakdowns
- 2 charts showing trends over time

**View**: https://console.cloud.google.com/monitoring/dashboards?project=omniclaw-enhanced

### Price Tracking Dashboard

**Location**: `monitoring/dashboards/price-tracking-dashboard.json`

**Metrics**:
- Scrapes per hour
- Average scraping latency
- Products tracked (via Firestore reads)
- Price alerts sent
- Pub/Sub queue depth

**Widgets**:
- 6 scorecards with price-tracking specific metrics
- 3 trend charts
- 1 logs panel for recent errors

**Use Cases**:
- Monitor scraping performance
- Detect queue backlogs
- Track alert delivery

### Media Streaming Dashboard

**Location**: `monitoring/dashboards/media-dashboard.json`

**Metrics**:
- Story generation requests
- Token refresh success rate
- Media processing latency
- Platform usage distribution (Spotify, etc.)
- API call rates

**Widgets**:
- 6 scorecards
- 1 pie chart (platform distribution)
- 3 trend charts
- 1 logs panel

**Use Cases**:
- Monitor token health
- Track generation latency
- Detect platform-specific issues

### Manual Dashboard Creation

If the automated script fails, create dashboards manually:

```bash
# Using gcloud CLI
gcloud monitoring dashboards create \
  --project=omniclaw-enhanced \
  --config-file=monitoring/dashboards/overview-dashboard.json

# Or via API
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/omniclaw-enhanced/dashboards" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @monitoring/dashboards/overview-dashboard.json
```

## Alert Policies

### Alert Severity Levels

| Severity | Description | Response Time | Notification |
|----------|-------------|---------------|--------------|
| **CRITICAL** | System impact, immediate action | < 15 min | Email + PagerDuty + Slack |
| **WARNING** | Degraded performance, monitor | < 1 hour | Email + Slack |
| **INFO** | Informational, no action | - | Slack only |

### Critical Alerts

1. **High Error Rate > 5%**
   - Threshold: 5% error rate for 5 minutes
   - Triggers: When any function has >5% errors
   - Actions: Check logs, investigate errors

2. **P95 Latency > 3s**
   - Threshold: P95 latency > 3s for 5 minutes
   - Triggers: When function performance degrades
   - Actions: Check cold starts, investigate bottlenecks

3. **Function Not Responding**
   - Threshold: Zero invocations for 10 minutes
   - Triggers: When function appears dead
   - Actions: Check function status, restart if needed

4. **Token Refresh Failure**
   - Threshold: >10% error rate for 5 minutes
   - Triggers: When token refresh fails
   - Actions: Check Spotify API credentials, rate limits

### Warning Alerts

1. **Elevated Error Rate > 1%**
   - Threshold: 1% error rate for 10 minutes
   - Actions: Monitor closely, investigate if increases

2. **Elevated Latency > 2s**
   - Threshold: P95 latency > 2s for 10 minutes
   - Actions: Check for cold starts, investigate

3. **High Memory Usage**
   - Threshold: >400 MiB for 5 minutes
   - Actions: Consider increasing memory allocation

4. **Price Scraping Backlog**
   - Threshold: Queue depth > 100 messages
   - Actions: Check scraper health, scale instances

### Info Alerts

1. **Cold Start > 5s**
   - Threshold: P99 latency > 5s for 1 minute
   - Actions: Consider keeping instances warm

2. **Spotify API Rate Limit**
   - Threshold: High error rate indicating rate limiting
   - Actions: Check API quota, implement backoff

### Managing Alert Policies

```bash
# List all alert policies
gcloud alpha monitoring policies list --project=omniclaw-enhanced

# View specific policy
gcloud alpha monitoring policies describe POLICY_ID --project=omniclaw-enhanced

# Enable/disable policy
gcloud alpha monitoring policies update POLICY_ID \
  --project=omniclaw-enhanced \
  --enabled=false

# Delete policy
gcloud alpha monitoring policies delete POLICY_ID \
  --project=omniclaw-enhanced
```

## Uptime Checks

### Configured Checks

| Function | Endpoint | Regions | Period |
|----------|----------|---------|--------|
| omniclaw-price | /omniclaw-price/health | USA, Europe, Asia | 5 min |
| omniclaw-analytics | /omniclaw-analytics/health | USA, Europe | 5 min |
| omniclaw-media | /omniclaw-media/health | USA, Europe | 5 min |
| omniclaw-media-refresh | /omniclaw-media-refresh/health | USA, Europe, Asia | 5 min |
| omniclaw-story | /omniclaw-story/health | USA, Europe | 5 min |
| omniclaw-email | /omniclaw-email/health | USA | 5 min |
| omniclaw-health | /omniclaw-health | All regions | 1 min |

### Creating Uptime Checks

**Option 1: Via Console**

1. Go to: https://console.cloud.google.com/monitoring/uptime?project=omniclaw-enhanced
2. Click "Create Uptime Check"
3. Configure:
   - Protocol: HTTPS
   - Port: 443
   - Path: /FUNCTION_NAME/health
   - Check frequency: 5 minutes
   - Regions: USA, Europe, Asia

**Option 2: Via API**

```bash
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/omniclaw-enhanced/uptimeCheckConfigs" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Price Tracking Health",
    "monitoredResource": {
      "type": "uptime_url",
      "labels": {
        "project_id": "omniclaw-enhanced",
        "host": "us-central1-omniclaw-enhanced.cloudfunctions.net"
      }
    },
    "httpCheck": {
      "path": "/omniclaw-price/health",
      "port": 443,
      "protocol": "HTTPS",
      "requestMethod": "GET"
    },
    "timeout": "10s",
    "period": "300s",
    "selectedRegions": ["USA", "EUROPE", "ASIA_PACIFIC"]
  }'
```

### Uptime Check Alerts

Uptime checks automatically create alert policies when checks fail:

- **Critical**: 2 consecutive failures (10 minutes)
- **Warning**: Response time > 5 seconds

## Notification Channels

### Email Notifications

```bash
# Create email channel
gcloud monitoring channels create \
  --project=omniclaw-enhanced \
  --channel-content-from-file=- <<EOF
{
  "type": "email",
  "displayName": "Email Alerts",
  "labels": {
    "email_address": "alerts@yourdomain.com"
  }
}
EOF
```

### Slack Notifications

```bash
# Create Slack channel
gcloud monitoring channels create \
  --project=omniclaw-enhanced \
  --channel-content-from-file=- <<EOF
{
  "type": "slack",
  "displayName": "Slack Alerts",
  "labels": {
    "channel_name": "#omniclaw-alerts",
    "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  }
}
EOF
```

### PagerDuty Notifications

```bash
# Create PagerDuty channel
gcloud monitoring channels create \
  --project=omniclaw-enhanced \
  --channel-content-from-file=- <<EOF
{
  "type": "pagerduty",
  "displayName": "PagerDuty Critical",
  "labels": {
    "integration_key": "YOUR_PAGERDUTY_KEY"
  }
}
EOF
```

### Verify Channels

```bash
# List all channels
gcloud monitoring channels list --project=omniclaw-enhanced

# Send test notification
gcloud monitoring channels send-test \
  --project=omniclaw-enhanced \
  CHANNEL_NAME
```

## Troubleshooting

### Dashboard Deployment Fails

**Issue**: Dashboard creation fails with error

**Solution**:
```bash
# Check if dashboard already exists
gcloud monitoring dashboards list \
  --project=omniclaw-enhanced \
  --filter="displayName:Overview"

# Update existing dashboard instead
gcloud monitoring dashboards update DASHBOARD_ID \
  --project=omniclaw-enhanced \
  --config-file=monitoring/dashboards/overview-dashboard.json
```

### Alert Policy Creation Fails

**Issue**: Alert policy not created

**Solution**:
```bash
# Check required permissions
gcloud projects get-iam-policy omniclaw-enhanced \
  --filter="bindings.roles:monitoring.editor"

# Verify JSON/YAML syntax
cat monitoring/alerts/alert-policies.yaml

# Create manually via Console
# https://console.cloud.google.com/monitoring/alerting?project=omniclaw-enhanced
```

### No Data in Dashboards

**Issue**: Dashboards show "No data available"

**Causes**:
1. Functions not deployed yet
2. Functions not receiving traffic
3. Metrics not yet collected (can take 5-10 minutes)

**Solutions**:
```bash
# Check if functions are deployed
gcloud functions list \
  --project=omniclaw-enhanced \
  --regions=us-central1

# Invoke function to generate metrics
curl -X POST \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-health"

# Wait 5-10 minutes for metrics to appear
```

### Uptime Check Failures

**Issue**: Uptime checks failing consistently

**Causes**:
1. Health endpoint not implemented
2. Function not deployed
3. Network/firewall issues

**Solutions**:
```bash
# Test health endpoint manually
curl -v \
  "https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price/health"

# Check function logs
gcloud functions logs read omniclaw-price \
  --project=omniclaw-enhanced \
  --region=us-central1 \
  --limit=50

# Verify function is running
gcloud functions describe omniclaw-price \
  --project=omniclaw-enhanced \
  --region=us-central1
```

## Maintenance

### Regular Tasks

**Weekly**:
- Review dashboard data for anomalies
- Check alert history for false positives
- Verify notification channels working

**Monthly**:
- Update alert thresholds based on trends
- Review uptime check performance
- Clean up old logs and metrics

**Quarterly**:
- Audit notification channel recipients
- Review and update runbooks
- Optimize dashboard layouts

### Updating Dashboards

```bash
# Edit dashboard configuration
vim monitoring/dashboards/overview-dashboard.json

# Update dashboard
gcloud monitoring dashboards update DASHBOARD_ID \
  --project=omniclaw-enhanced \
  --config-file=monitoring/dashboards/overview-dashboard.json
```

### Updating Alert Policies

```bash
# Edit policy configuration
vim monitoring/alerts/alert-policies.yaml

# Note: Policies need to be recreated or updated via Console/API
# See: https://console.cloud.google.com/monitoring/alerting?project=omniclaw-enhanced
```

### Export/Import Monitoring Configuration

```bash
# Export all dashboards
gcloud monitoring dashboards list --project=omniclaw-enhanced \
  --format="value(name)" | while read id; do
    gcloud monitoring dashboards describe "$id" \
      --project=omniclaw-enhanced > "dashboard-${id}.json"
  done

# Export all alert policies
gcloud alpha monitoring policies list --project=omniclaw-enhanced \
  --format="value(name)" | while read id; do
    gcloud alpha monitoring policies describe "$id" \
      --project=omniclaw-enhanced > "policy-${id}.yaml"
  done
```

## Additional Resources

### Monitoring Console Links

- **Overview**: https://console.cloud.google.com/monitoring?project=omniclaw-enhanced
- **Dashboards**: https://console.cloud.google.com/monitoring/dashboards?project=omniclaw-enhanced
- **Alerting**: https://console.cloud.google.com/monitoring/alerting?project=omniclaw-enhanced
- **Uptime Checks**: https://console.cloud.google.com/monitoring/uptime?project=omniclaw-enhanced
- **Logs Explorer**: https://console.cloud.google.com/logs/query?project=omniclaw-enhanced

### Documentation

- [Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Alert Policies Guide](https://cloud.google.com/monitoring/alerts)
- [Dashboard Creation Guide](https://cloud.google.com/monitoring/dashboards)
- [Uptime Checks Guide](https://cloud.google.com/monitoring/uptime-checks)

### Quick Reference

```bash
# Quick status check
echo "=== OmniClaw Enhanced Monitoring Status ==="
echo ""
echo "Dashboards:"
gcloud monitoring dashboards list --project=omniclaw-enhanced --format="table(displayName,name)"
echo ""
echo "Alert Policies:"
gcloud alpha monitoring policies list --project=omniclaw-enhanced --format="table(displayName,name,enabled)"
echo ""
echo "Uptime Checks:"
gcloud monitoring uptime-checks list --project=omniclaw-enhanced --format="table(displayName,name)"
echo ""
echo "Notification Channels:"
gcloud monitoring channels list --project=omniclaw-enhanced --format="table(displayName,name,type)"
```

## Support

For issues or questions:

1. Check logs: `gcloud logging tail --project=omniclaw-enhanced`
2. Review this guide
3. Check Cloud Monitoring documentation
4. Contact the OmniClaw team

---

**Last Updated**: 2026-03-27
**Version**: 1.0.0
