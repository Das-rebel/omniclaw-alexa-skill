# Deployment Checklist - OmniClaw Enhanced

## Pre-Deployment Checklist

### Environment Setup
- [ ] Google Cloud SDK installed and configured
- [ ] Project `omniclaw-enhanced` is active
- [ ] Authentication with `gcloud auth login`
- [ ] Default region set to `us-central1`
- [ ] `.env` file exists with all required variables

### Environment Variables Verification
- [ ] `UPSTASH_REDIS_REST_URL` is set
- [ ] `UPSTASH_REDIS_REST_TOKEN` is set
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is set
- [ ] `SENDGRID_API_KEY` is set (optional, for email alerts)
- [ ] `TWILIO_ACCOUNT_SID` is set (optional, for SMS alerts)
- [ ] `TWILIO_AUTH_TOKEN` is set (optional, for SMS alerts)

### Source Files Verification
- [ ] `/apps/price-tracking/` directory exists
- [ ] `/apps/analytics/` directory exists
- [ ] All scrapers present in `price-tracking/scrapers/`
- [ ] All services present in `price-tracking/services/`
- [ ] Analytics files present in `analytics/services/`

### Deployment Files Prepared
- [ ] `deploy-omniclaw-price.sh` created
- [ ] `deploy-omniclaw-analytics.sh` created
- [ ] `index-full.js` created for price function
- [ ] `index-full.js` created for analytics function
- [ ] `MANUAL_DEPLOYMENT_GUIDE.md` created
- [ ] `QUICK_DEPLOY_REFERENCE.md` created
- [ ] `DEPLOYMENT_AGENT2_SUMMARY.md` created

---

## Deployment Checklist - omniclaw-price

### Preparation
- [ ] Navigate to `/deploy/functions/omniclaw-price/`
- [ ] Create directory structure (scrapers, services, config, notifiers, processors, src)
- [ ] Copy all scrapers from source
- [ ] Copy all services from source
- [ ] Copy config files from source
- [ ] Copy notifiers from source
- [ ] Copy processors from source
- [ ] Copy src files from source

### Configuration
- [ ] Replace `index.js` with `index-full.js`
- [ ] Update `package.json` with all dependencies
- [ ] Run `npm install --production`
- [ ] Verify node_modules created

### Deployment
- [ ] Load environment variables from `.env`
- [ ] Run `gcloud functions deploy` command
- [ ] Verify deployment output shows "Deployed"
- [ ] Note function URL from deployment output

### Post-Deployment Verification
- [ ] Health check returns 200: `curl {function_url}/health`
- [ ] addProduct endpoint works
- [ ] getTracked endpoint works
- [ ] checkPrices endpoint works
- [ ] Response time < 30 seconds
- [ ] No errors in Cloud Logs
- [ ] Redis Streams connected
- [ ] Playwright browsers launch successfully

---

## Deployment Checklist - omniclaw-analytics

### Preparation
- [ ] Navigate to `/deploy/functions/omniclaw-analytics/`
- [ ] Create directory structure (services, middleware, api, dashboard)
- [ ] Copy all services from source
- [ ] Copy middleware from source
- [ ] Copy API files from source
- [ ] Copy dashboard files from source

### Configuration
- [ ] Replace `index.js` with `index-full.js`
- [ ] Update `package.json` with all dependencies
- [ ] Run `npm install --production`
- [ ] Verify node_modules created

### Deployment
- [ ] Load environment variables from `.env`
- [ ] Run `gcloud functions deploy` command
- [ ] Verify deployment output shows "Deployed"
- [ ] Note function URL from deployment output

### Post-Deployment Verification
- [ ] Health check returns 200: `curl {function_url}/health`
- [ ] trackEvent endpoint works
- [ ] trackRequest endpoint works
- [ ] getMetrics endpoint works
- [ ] getReport endpoint works
- [ ] getUserStats endpoint works
- [ ] Response time < 2 seconds
- [ ] No errors in Cloud Logs
- [ ] Data stored in Firestore
- [ ] Data stored in Redis

---

## Integration Testing Checklist

### Price Tracking End-to-End
- [ ] Add a product via API
- [ ] Verify product stored in Redis
- [ ] Trigger price check
- [ ] Verify scraper executes
- [ ] Check price data stored
- [ ] Verify alert evaluation works
- [ ] Test notification delivery (if configured)
- [ ] Get price history
- [ ] Remove product

### Analytics End-to-End
- [ ] Track an event
- [ ] Verify event in Firestore
- [ ] Verify event in Redis
- [ ] Track a request with metrics
- [ ] Track feature usage
- [ ] Track an error
- [ ] Get metrics summary
- [ ] Generate usage report
- [ ] Get user statistics
- [ ] Get performance metrics
- [ ] Get cost metrics

---

## Monitoring Setup Checklist

### Cloud Monitoring
- [ ] Create dashboard for price function
- [ ] Create dashboard for analytics function
- [ ] Set up alert policies for errors
- [ ] Set up alert policies for latency
- [ ] Set up alert policies for cost

### Cloud Logging
- [ ] Create log sinks for price function
- [ ] Create log sinks for analytics function
- [ ] Set up log-based metrics
- [ ] Configure log export (if needed)

### Cloud Scheduler (Price Function)
- [ ] Create scheduled job for price checks
- [ ] Set schedule (e.g., every 6 hours)
- [ ] Configure time zone
- [ ] Test scheduler trigger
- [ ] Verify execution logs

---

## Documentation Checklist

### API Documentation
- [ ] Document all price endpoints
- [ ] Document all analytics endpoints
- [ ] Add request/response examples
- [ ] Add error codes reference
- [ ] Add rate limits (if any)

### Operational Documentation
- [ ] Update deployment guide
- [ ] Create troubleshooting guide
- [ ] Document common issues
- [ ] Add rollback procedures
- [ ] Create runbook for incidents

### User Documentation
- [ ] Update README with new function URLs
- [ ] Add quick start guide
- [ ] Provide usage examples
- [ ] Add integration examples
- [ ] Document environment variables

---

## Cost Monitoring Checklist

### Immediate Post-Deployment
- [ ] Check current billing account
- [ ] Note current month's costs
- [ ] Set up budget alerts
- [ ] Monitor function invocations
- [ ] Monitor compute time

### Ongoing Monitoring
- [ ] Review costs weekly
- [ ] Identify cost anomalies
- [ ] Optimize cold starts
- [ ] Adjust memory if needed
- [ ] Implement caching where possible

---

## Security Checklist

### Access Control
- [ ] Verify authentication requirements
- [ ] Check API key protections
- [ ] Review IAM permissions
- [ ] Audit function invocations
- [ ] Set up security scan alerts

### Data Protection
- [ ] Verify encrypted connections
- [ ] Check sensitive data handling
- [ ] Review Redis access controls
- [ ] Audit Firestore rules
- [ ] Verify no API keys in logs

---

## Rollback Checklist

### If Deployment Fails
- [ ] Identify failure point
- [ ] Check Cloud Logs for errors
- [ ] Verify environment variables
- [ ] Check dependencies
- [ ] Review function code
- [ ] Consider rollback to previous version

### Rollback Procedure
- [ ] `gcloud functions deploy omniclaw-price --version={previous_version}`
- [ ] `gcloud functions deploy omniclaw-analytics --version={previous_version}`
- [ ] Verify rollback successful
- [ ] Monitor for issues
- [ ] Document failure for future reference

---

## Completion Checklist

### Deployment Complete
- [ ] Both functions deployed
- [ ] All tests passing
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified
- [ ] Stakeholders informed

### Handoff Complete
- [ ] Runbook created
- [ ] On-call rotation aware
- [ ] Alerts configured
- [ ] Escalation path defined
- [ ] Success criteria met

---

## Success Metrics

### Deployment Success
- Both functions deployed without errors
- All health checks passing
- Response times within SLA
- No critical errors in logs

### Operational Success
- Mean time to deploy < 1 hour
- Function availability > 99.9%
- Error rate < 1%
- Cost within budget

### Integration Success
- All endpoints functional
- Data persistence verified
- Third-party integrations working
- Monitoring and alerts active

---

## Next Actions

### Day 1 Post-Deployment
- Monitor logs for 2 hours
- Run full integration test suite
- Verify all alerts working
- Document any issues

### Week 1 Post-Deployment
- Daily cost reviews
- Performance optimization
- User feedback collection
- Bug fix deployment as needed

### Month 1 Post-Deployment
- Cost analysis and optimization
- Performance tuning
- Feature expansion planning
- Documentation updates

---

## Emergency Contacts

### Primary
- Deployment Lead: [Contact]
- Cloud Architect: [Contact]
- DevOps Engineer: [Contact]

### Escalation
- Engineering Manager: [Contact]
- CTO: [Contact]

### Resources
- Google Cloud Support: https://cloud.google.com/support
- Documentation: See project README and guides

---

**Checklist Version**: 1.0
**Last Updated**: 2026-03-26
**Status**: Ready for Deployment
