# OmniClaw Unified Project - Combined Task & Strategy

**Created**: 2026-04-24
**Status**: Active Development
**Backup**: All data backed up to `gs://omniclaw-backup-2026-04-24/`

---

## 📦 Current Cloud Run Services (7 working)

| Service | URL | Status |
|---------|-----|--------|
| alexa-handler | https://alexa-handler-o36e7noe5a-el.a.run.app | ✅ Working |
| omniclaw-vault-search | https://omniclaw-vault-search-o36e7noe5a-el.a.run.app | ✅ Working |
| twitter-sync | https://twitter-sync-o36e7noe5a-el.a.run.app | ✅ Working |
| instagram-sync | https://instagram-sync-o36e7noe5a-el.a.run.app | ✅ Working |
| bookmark-processor | https://bookmark-processor-o36e7noe5a-el.a.run.app | ✅ Working |
| cookierefresh | https://cookierefresh-o36e7noe5a-el.a.run.app | ✅ Working |
| instatter | https://instatter-o36e7noe5a-el.a.run.app | ✅ Working |

**WhatsApp on VM**: `34.100.240.249:9377` (Production)

---

## 📋 Task Board

### 🔴 Critical (Fix Now)
- [x] WhatsApp session restore → ✅ Connected
- [x] Hourly cron sync → ✅ Working (172K backup hourly)
- [x] Alexa clients → ✅ 23/25 working (only TMLPDClient, BaileysWhatsAppClient down)

### 🟡 High Priority (This Week)
- [x] Delete orphaned Cloud Run services → ✅ Done (whatsapp-cloud, whatsapp-qr-cloud, story-narrator, price-tracking, celebrity-tts deleted)
- [x] Add vault data sources → ✅ 5 sources now
- [x] Update README → ✅ Committed

### 🟢 Medium Priority (This Month)
- [ ] Fix Price Tracking → 🔧 Syntax fixed, needs redis mock or removal
- [ ] Fix Story Narrator → 🔧 Needs source code cleanup before redeploy
- [ ] Deploy Celebrity TTS → 🔧 Deleted failing service, needs simpler deployment
- [x] Terraform setup → ✅ Created infrastructure-enhanced/terraform/gcp/
- [x] Clean docs/ → ✅ Removed old docs (17 remaining)
- [ ] Set up CI/CD → ⏸️ GitHub Actions need `workflow` OAuth scope

### ⚪ Low Priority (Backlog)
- [ ] Deploy Price Tracking (needs redis mock)
- [ ] Deploy Story Narrator (needs source cleanup)
- [ ] Deploy Celebrity TTS (needs simpler approach)
- [ ] Deploy Email Intelligence
- [ ] Deploy Analytics Dashboard

---

## 📊 Production Status

| Component | Location | Status |
|-----------|----------|--------|
| WhatsApp | VM `34.100.240.249:9377` | ✅ Connected |
| Alexa Handler | Cloud Run | ✅ 23/25 clients |
| Vault Search | Cloud Run | ✅ Working |
| Twitter Sync | Cloud Run | ✅ Working |
| Instagram Sync | Cloud Run | ✅ Working |
| WhatsApp Backup | GCS hourly | ✅ Cron set up |

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

# Sync WhatsApp auth
gcloud compute ssh omniclaw-whatsapp --zone=asia-south1-b
sudo /usr/local/bin/whatsapp_gcs_sync.sh
```

---

## 💾 Backup

- GCS: `gs://omniclaw-backup-2026-04-24/`
- WhatsApp: Hourly to `gs://omniclaw-knowledge-graph/backups/`

---

**Last Updated**: 2026-04-24
**Next Review**: 2026-05-01