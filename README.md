# OmniClaw - AI Personal Assistant

**Version**: 2.0 (Merged) | **Status**: Active | **Project**: omniclaw-personal-assistant

A unified AI personal assistant combining production services with enhanced capabilities.

---

## 🚀 Active Services

| Service | URL | Purpose |
|---------|-----|---------|
| WhatsApp | `34.100.240.249:9377` | Messaging + Vault |
| Alexa Handler | `https://alexa-handler-o36e7noe5a-el.a.run.app` | HALO AI |
| Vault Search | `https://omniclaw-vault-search-o36e7noe5a-el.a.run.app` | Knowledge Graph |
| Twitter Sync | `https://twitter-sync-o36e7noe5a-el.a.run.app` | Bookmark sync |
| Instagram Sync | `https://instagram-sync-o36e7noe5a-el.a.run.app` | Bookmark sync |

---

## 📁 Directory Structure

```
omniclaw-personal-assistant/
├── infrastructure/           # Production
│   ├── cloud-functions/deploy/  # alexa-handler
│   └── whatsapp-qr-cloud/       # WhatsApp (VM)
├── infrastructure-enhanced/  # Future infra
├── services/                # Standalone services
│   ├── celebrity-tts-service/
│   └── ml-analytics/
├── apps-enhanced/           # Future apps
│   ├── price-tracking/
│   ├── story-narrator/
│   ├── email-intelligence/
│   └── analytics/
├── src/                     # Python ML
├── docs/                    # Current docs
└── docs-enhanced/          # Enhanced docs (117 files)
```

---

## 📋 Quick Commands

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

- GCS Bucket: `gs://omniclaw-backup-2026-04-24/`
- WhatsApp Auth: Hourly to `gs://omniclaw-knowledge-graph/backups/`
- Knowledge Graph: `gs://omniclaw-knowledge-graph/`

---

## 📊 Status (2026-04-24)

- ✅ WhatsApp: Connected (VM), Hourly backup
- ✅ Alexa Handler: 23/25 clients working
- ✅ Vault: 5 data sources
- 🔜 Deploy: price-tracking, story-narrator, celebrity-tts

