# OmniClaw Unified Project - Combined Task & Strategy

**Created**: 2026-04-24
**Updated**: 2026-04-24
**Status**: Active Development
**Backup**: `gs://omniclaw-backup-2026-04-24/`

---

## 📋 Current Cloud Run Services (9 working)

| Service | URL | Status |
|---------|-----|--------|
| alexa-handler | https://alexa-handler-o36e7noe5a-el.a.run.app | ✅ |
| omniclaw-vault-search | https://omniclaw-vault-search-o36e7noe5a-el.a.run.app | ✅ |
| twitter-sync | https://twitter-sync-o36e7noe5a-el.a.run.app | ✅ |
| instagram-sync | https://instagram-sync-o36e7noe5a-el.a.run.app | ✅ |
| bookmark-processor | https://bookmark-processor-o36e7noe5a-el.a.run.app | ✅ |
| cookierefresh | https://cookierefresh-o36e7noe5a-el.a.run.app | ✅ |
| instatter | https://instatter-o36e7noe5a-el.a.run.app | ✅ |
| celebrity-tts | https://celebrity-tts-338789220059.asia-south1.run.app | ✅ |
| **story-narrator** | https://story-narrator-338789220059.asia-south1.run.app | ✅ NEW |

**WhatsApp on VM**: `34.100.240.249:9377` (Production)

---

## 📊 Production Status

| Component | Location | Status |
|-----------|----------|--------|
| WhatsApp | VM `34.100.240.249:9377` | ✅ Connected |
| Alexa Handler | Cloud Run | ✅ 23/25 clients |
| Vault Search | Cloud Run | ✅ Working |
| Celebrity TTS | Cloud Run | ✅ Working (mock) |
| Twitter Sync | Cloud Run | ✅ Working |
| Instagram Sync | Cloud Run | ✅ Working |
| WhatsApp Backup | GCS hourly | ✅ Cron set up |

---

## 📋 Task Board

### ✅ Completed
- [x] WhatsApp session restore → Connected
- [x] Hourly cron sync → Working (172K backup hourly)
- [x] Alexa clients → 23/25 working
- [x] Delete orphaned services → Done
- [x] Add vault data sources → 5 sources
- [x] Update README → Done
- [x] Deploy Celebrity TTS → ✅ Working (mock)
- [x] Terraform setup → ✅ Done
- [x] Clean docs/ → ✅ Done

### 🔜 Remaining (Low Priority)
- [ ] Fix Price Tracking (complex deps)
- [ ] Fix Story Narrator (complex deps)
- [ ] Set up CI/CD (needs OAuth scope)

---

## 🔧 Quick Commands

```bash
# Check WhatsApp
curl http://34.100.240.249:9377/health

# Vault query
curl -X POST http://34.100.240.249:9377/whatsapp/receive \
  -H "Content-Type: application/json" \
  -d '{"message": "^vault Python"}'

# Deploy alexa-handler
cd infrastructure/cloud-functions/deploy
gcloud run deploy alexa-handler --source . --region asia-south1
```

---

## 💾 Backup

- GCS: `gs://omniclaw-backup-2026-04-24/`
- WhatsApp: Hourly to `gs://omniclaw-knowledge-graph/backups/`

---

**Last Updated**: 2026-04-24
**Next Review**: 2026-05-01