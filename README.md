# OmniClaw - AI Personal Assistant (Alexa Skill)

**Voice-first AI assistant deployed across Alexa, WhatsApp, Telegram, and web.**

Version 2.0 (Merged) · Active · Part of the [omniclaw](https://github.com/Das-rebel/omniclaw) ecosystem

---

## What It Does

OmniClaw is a unified AI personal assistant that combines voice (Alexa), messaging (WhatsApp, Telegram), and web interfaces into a single intelligent layer.

```
User Voice/Text
     ↓
┌──────────────────────────────────────────┐
│  OmniClaw Pipeline                       │
│                                          │
│  1. Signal → What did the user send?    │
│  2. Plan → What should I do?              │
│  3. Execute → Run the plan               │
│  4. Respond → Return response            │
└──────────────────────────────────────────┘
     ↓
  Alexa ← WhatsApp ← Telegram ← Web
```

---

## Active Services

| Service | Endpoint | Purpose | Status |
|---------|----------|---------|:------:|
| **WhatsApp** | `34.100.240.249:9377` | Messaging + Vault | ✅ |
| **Alexa Handler** | `alexa-handler-o36e7noe5a-el.a.run.app` | HALO AI voice | ✅ |
| **Vault Search** | `omniclaw-vault-search-*.run.app` | Knowledge Graph | ✅ |
| **Twitter Sync** | `twitter-sync-*.run.app` | Bookmark sync | ✅ |
| **Instagram Sync** | `instagram-sync-*.run.app` | Bookmark sync | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OmniClaw Client Layer                 │
├─────────────┬──────────────────┬────────────────────────┤
│   Alexa     │   WhatsApp       │   Telegram / Web      │
│   (Voice)   │   (Messaging)    │   (Text)              │
└─────────────┴──────────────────┴────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│                  OmniClaw Orchestration                  │
│                                                          │
│  Skills: 12 MCP skills (TDD, diagnose, grill-me, etc.)  │
│  Memory: Persistent knowledge graph                      │
│  Routing: Multi-provider LLM (OpenAI, Anthropic, Groq)   │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure                         │
│                                                          │
│  GCP Cloud Run (alexa-handler, vault, twitter/insta sync)│
│  Google Drive (rclone backup)                           │
│  Knowledge Graph (GCS bucket)                           │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Check WhatsApp health
curl http://34.100.240.249:9377/health

# Query Vault via WhatsApp
curl -X POST http://34.100.240.249:9377/whatsapp/receive \
  -H "Content-Type: application/json" \
  -d '{"message": "^vault Python"}'

# Vault search (HTTP)
curl -X POST https://omniclaw-vault-search-o36e7noe5a-el.a.run.app/search \
  -d '{"query": "Python best practices"}'

# Deploy Alexa Handler to GCP
cd infrastructure/cloud-functions/deploy
gcloud run deploy alexa-handler --source . --region asia-south1
```

---

## Services

### Alexa Handler
Voice AI endpoint on GCP Cloud Run. Processes Alexa requests and returns responses.

**Endpoint:** `https://alexa-handler-o36e7noe5a-el.a.run.app`

### WhatsApp
WhatsApp messaging bridge with Vault integration. Commands start with `^`.

| Command | Description |
|---------|-------------|
| `^vault <query>` | Search knowledge graph |
| `^status` | System health |
| `^backup` | Force backup |

### Vault Search
Semantic search over your knowledge graph. Searches across all synced sources.

### Social Sync
Automatic bookmark synchronization from Twitter and Instagram.

---

## Directory Structure

```
omniclaw-alexa-skill/
├── infrastructure/           # Production deployment
│   ├── cloud-functions/deploy/  # alexa-handler (GCP Cloud Run)
│   └── whatsapp-qr-cloud/       # WhatsApp on VM
├── infrastructure-enhanced/  # Future infra
├── services/                # Standalone services
│   ├── celebrity-tts-service/   # Celebrity voice TTS
│   └── ml-analytics/            # Analytics ML
├── apps-enhanced/           # Future apps
│   ├── price-tracking/      # Price monitoring
│   ├── story-narrator/      # AI storytelling
│   ├── email-intelligence/   # Email AI
│   └── analytics/           # Analytics dashboard
├── src/                     # Python ML code
├── docs/                    # Current documentation
└── docs-enhanced/          # Enhanced docs (117 files)
```

---

## Backup & Data

| Data | Location | Frequency |
|------|----------|-----------|
| WhatsApp auth | `gs://omniclaw-knowledge-graph/backups/` | Hourly |
| Knowledge Graph | `gs://omniclaw-knowledge-graph/` | Daily |
| Full backup | `gs://omniclaw-backup-2026-04-24/` | Manual |

---

## Status (May 2026)

| Component | Status |
|-----------|:------:|
| WhatsApp (VM) | ✅ Connected |
| Alexa Handler (GCP) | ✅ Deployed |
| Vault Search | ✅ Running |
| Twitter Sync | ✅ Running |
| Instagram Sync | ✅ Running |
| 23/25 Alexa clients | ✅ Working |

---

## Stack

Python · GCP Cloud Run · Google Drive (rclone) · WhatsApp API · Alexa Skills Kit

---

## Related

- [omniclaw](https://github.com/Das-rebel/omniclaw) — Main repository
- [sota-browser](https://github.com/Das-rebel/sota-browser) — Browser automation
- [growth-workflow-os](https://github.com/Das-rebel/growth-workflow-os) — Strategic OS

MIT License
