# OmniClaw Enhanced - Quick Reference

## All Functions Deployed ✅

```
Health:   https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-health/health
Email:    https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-email
Price:    https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price
Media:    https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media
Story:    https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story
Analytics: https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics
```

## Quick Test Commands

### Health Checks
```bash
# Test all functions
for func in health email price media story analytics; do
  echo "Testing omniclaw-$func..."
  curl -s https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-$func/health | jq .
done
```

### Email Function
```bash
curl -X POST https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-email \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "getSummary",
    "userId": "test@example.com"
  }' | jq .
```

### Price Tracking
```bash
curl -X POST https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-price \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "addProduct",
    "userId": "test@example.com",
    "url": "https://amazon.com/dp/B08N5WRWNW",
    "threshold": 1000
  }' | jq .
```

### Media Streaming
```bash
curl -X POST https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-media \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "play",
    "userId": "test@example.com",
    "platform": "spotify",
    "query": "Bohemian Rhapsody",
    "type": "track"
  }' | jq .
```

### Story Narrator
```bash
curl -X POST https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-story \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "generate",
    "userId": "test@example.com",
    "theme": "adventure",
    "characters": 2,
    "mood": "exciting",
    "language": "english"
  }' | jq .
```

### Analytics
```bash
curl -X POST https://us-central1-omniclaw-enhanced.cloudfunctions.net/omniclaw-analytics \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "getReport",
    "userId": "test@example.com",
    "period": "daily"
  }' | jq .
```

## Project Details

- **Project ID**: omniclaw-enhanced
- **Project Number**: 711684817050
- **Region**: us-central1
- **Runtime**: Node.js 22
- **Version**: 2.2.0 (Story Narrator Enhanced)

## API Keys (Secured in Secret Manager)

### LLM Providers (3 Keys)
- ✅ Groq API Key - Ultra-fast responses (0.14s)
- ✅ Cerebras API Key - Complex reasoning (235B params)
- ✅ Z.ai API Key - Bilingual Hinglish support

### TTS Providers (2 Keys)
- ✅ ElevenLabs API Key - Professional voice synthesis
- ✅ Sarvam AI API Key - Indian languages (HI, BN, TA)

## LLM Providers

| Provider | Model | Latency | Use Case |
|----------|-------|---------|----------|
| Groq | llama-3.3-70b | 0.14s | Fast responses |
| Cerebras | qwen-3-235b | 0.38s | Complex reasoning |
| Z.ai/GLM | glm-4-plus | 0.62s | Bilingual Hinglish |

## TTS Providers

| Provider | Model | Quality | Use Case |
|----------|-------|---------|----------|
| ElevenLabs | Turbo v2.5 | Professional | Primary TTS |
| Sarvam AI | v2 | Native | Indian languages |
| Celebrity TTS | XTTS | Premium | Celebrity voices (optional) |

## Service Capabilities

### Email Intelligence
- Gmail & Outlook integration
- Multi-agent processing
- Smart replies
- Email summarization

### Price Tracking
- Amazon, Flipkart, Myntra
- Real-time monitoring
- Stealth scraping
- Price alerts

### Media Streaming
- Spotify, YouTube, Fen (Kodi)
- Unified control
- Cross-platform search
- Voice commands

### Story Narrator (v2.2.0)
- Multi-character voices (5 profiles)
- Emotional modulation (5 emotions)
- Multi-language (EN, HI, Hinglish, BN, TA)
- Archetype detection (automatic voice mapping)
- Celebrity voice infrastructure (ready for deployment)
- ElevenLabs TTS integration (primary)
- Chapter metadata (ready for pause/resume)

### Analytics
- Usage tracking
- Performance metrics
- Cost analysis
- Error monitoring

## Monitoring

### View Logs
```bash
gcloud functions logs read omniclaw-health --project=omniclaw-enhanced --region=us-central1 --limit=50
```

### List Functions
```bash
gcloud functions list --project=omniclaw-enhanced --regions=us-central1
```

### Check Status
```bash
gcloud functions describe omniclaw-email --region=us-central1 --project=omniclaw-enhanced
```

## Troubleshooting

### Function Not Responding
1. Check logs: `gcloud functions logs read <function-name>`
2. Verify secrets: `gcloud secrets list`
3. Check IAM: `gcloud projects get-iam-policy omniclaw-enhanced`

### API Key Errors
1. Verify secret exists: `gcloud secrets describe <secret-name>`
2. Check access: `gcloud secrets get-iam-policy <secret-name>`
3. Redeploy function if needed

### Performance Issues
1. Check memory: Currently 512MB (can increase to 2048MB)
2. Check timeout: Currently 60s (can increase to 120s)
3. Check concurrency: Currently 1 (can increase)

## Deployment Commands

### Redeploy Single Function
```bash
gcloud functions deploy omniclaw-email \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs22 \
  --memory=512MB \
  --timeout=60s \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=emailHandler \
  --source=/Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-email \
  --set-secrets=GROQ_API_KEY=groq-api-key:latest,CEREBRAS_API_KEY=cerebras-api-key:latest,ZAI_API_KEY=zai-api-key:latest \
  --project=omniclaw-enhanced
```

### Update Secrets
```bash
echo -n "new_api_key" | gcloud secrets versions add groq-api-key --data-file= --project=omniclaw-enhanced
```

## Documentation

- Full Deployment Guide: `/Users/Subho/omniclaw-enhanced/docs/DEPLOYMENT_GUIDE.md`
- Runbook: `/Users/Subho/omniclaw-enhanced/docs/RUNBOOK.md`
- Architecture: `/Users/Subho/omniclaw-enhanced/docs/ARCHITECTURE.md`
- Complete Deployment Report: `/Users/Subho/omniclaw-enhanced/DEPLOYMENT_COMPLETE.md`

---
**Status**: ✅ All Systems Operational
**Version**: 2.2.0 (Enhanced Story Narrator)
**Last Updated**: 2026-03-26
**Test Success**: 100% (36/36 tests)
