# API Keys Quick Reference

## ✅ CONFIGURED & WORKING (5 Keys)

### LLM Providers - Core Functionality
```
1. Groq (llama-3.3-70b-versatile)
   - Secret: groq-api-key
   - Purpose: Ultra-fast responses (0.14s latency)
   - Status: ✅ Active

2. Cerebras (qwen-3-235b-a22b-instruct)
   - Secret: cerebras-api-key
   - Purpose: Complex reasoning (235B params)
   - Status: ✅ Active

3. Z.ai/GLM (glm-4-plus)
   - Secret: zai-api-key
   - Purpose: Bilingual Hinglish support
   - Status: ✅ Active
```

### TTS Providers - Voice Synthesis
```
4. ElevenLabs (Turbo v2.5)
   - Secret: elevenlabs-api-key
   - Purpose: Professional voice synthesis
   - Status: ✅ Active

5. Sarvam AI (v2)
   - Secret: sarvam-api-key
   - Purpose: Indian languages (Hindi, Bengali, Tamil)
   - Status: ✅ Active
```

**What They Power**:
- Email intelligence (summarization, drafting)
- Price tracking (monitoring logic, alerts)
- Media streaming (basic control)
- Story generation (LLM-powered with archetype detection)
- Story narration (high-quality TTS with multiple voices)
- Analytics (reporting)
- All AI text processing
- Multi-language support (EN, HI, Hinglish, BN, TA)

---

## ❌ OPTIONAL (Enhanced Features)

### For Celebrity Voice Cloning
```
Celebrity TTS Service Deployment
- Purpose: Real celebrity voices (Amitabh Bachan, Tom Cruise, etc.)
- Cost: $50-400/month (CPU/GPU)
- Infrastructure: ✅ Complete and ready to deploy
- Status: 📋 Optional deployment when desired
```

### For Real Media Integration
```
Spotify Client ID & Secret
- Purpose: Playlist management, advanced controls
- Cost: Free
- Setup: https://developer.spotify.com/dashboard

YouTube Data API v3 Key
- Purpose: Search, recommendations
- Cost: Free tier (10K units/day)
- Setup: https://console.cloud.google.com/apis/library/youtube.googleapis.com
```

### For Notifications
```
Slack Bot Token
- Purpose: Slack alerts
- Cost: Free
- Setup: Slack App settings

Discord Bot Token
- Purpose: Discord alerts
- Cost: Free
- Setup: Discord Developer Portal

Telegram Bot Token
- Purpose: Telegram messages
- Cost: Free
- Setup: @BotFather on Telegram
```

---

## 🎯 RECOMMENDATION

**Current setup is production-ready!** All core features working with professional TTS.

Optional enhancements when you need:
- Celebrity voices → Deploy Celebrity TTS Service (infrastructure ready)
- Real music control → Add Spotify/YouTube API keys
- Chat notifications → Add Slack/Discord/Telegram tokens

---

## 🔧 How to Add Optional Keys

### Example: Adding ElevenLabs

```bash
# 1. Get API key from https://elevenlabs.io

# 2. Create secret
echo -n "your_key_here" | gcloud secrets create elevenlabs-api-key --data-file=- --project=omniclaw-enhanced

# 3. Grant access
gcloud secrets add-iam-policy-binding elevenlabs-api-key \
  --member="serviceAccount:711684817050-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=omniclaw-enhanced

# 4. Redeploy functions (if needed)
gcloud functions deploy omniclaw-story --gen2 --region=us-central1 \
  --runtime=nodejs22 --memory=512MB --timeout=60s --trigger-http \
  --allow-unauthenticated --entry-point=storyHandler \
  --source=/Users/Subho/omniclaw-enhanced/deploy/functions/omniclaw-story \
  --set-secrets=GROQ_API_KEY=groq-api-key:latest,CEREBRAS_API_KEY=cerebras-api-key:latest,ZAI_API_KEY=zai-api-key:latest,ELEVENLABS_API_KEY=elevenlabs-api-key:latest,SARVAM_API_KEY=sarvam-api-key:latest \
  --project=omniclaw-enhanced
```

---

## 📊 Current Setup

**Total Secrets**: 5 API keys configured
- 3 LLM providers (Groq, Cerebras, Z.ai/GLM)
- 2 TTS providers (ElevenLabs, Sarvam AI)

**Cost**: $0 (free tiers for LLMs, ElevenLabs trial, Sarvam free tier)
**Status**: ✅ Production ready
**Test Success**: 100% (36/36 tests passing)
**Version**: 2.2.0 (Enhanced with celebrity voice infrastructure)

**You're all set!** Celebrity TTS service infrastructure is ready for deployment when desired.

---

*Updated: 2026-03-26*
