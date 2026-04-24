# OmniClaw Unified Project - Combined Task & Strategy

**Created**: 2026-04-24
**Status**: Active Development
**Backup**: All data backed up to `gs://omniclaw-backup-2026-04-24/`

---

## 📦 What's In This Repo

### Production Ready
| Component | Location | Status |
|-----------|----------|--------|
| WhatsApp (VM) | `infrastructure/whatsapp-qr-cloud/` | ✅ Active |
| Alexa Handler | `infrastructure/cloud-functions/deploy/` | ✅ Active |
| Vault Search | `omniclaw-vault-search` (Cloud Run) | ✅ Active |
| Bookmark Sync | `twitter-sync`, `instagram-sync` (Cloud Run) | ✅ Active |

### Future Deploy (from omniclaw-enhanced)
| Component | Location | Status |
|-----------|----------|--------|
| Price Tracking ML | `apps-enhanced/price-tracking/` | 🔜 Deploy |
| Story Narrator | `apps-enhanced/story-narrator/` | 🔜 Deploy |
| Celebrity TTS | `services/celebrity-tts-service/` | 🔜 Deploy |
| Email Intelligence | `apps-enhanced/email-intelligence/` | 🔜 Deploy |
| Analytics Dashboard | `apps-enhanced/analytics/` | 🔜 Deploy |
| API Gateway | `services/api-gateway/` | 🔜 Deploy |

---

## 🎯 Strategy: Phase-Based Execution

### Phase 0: Stabilize (NOW)
- [x] Backup all data to GCS
- [x] Merge repos
- [x] WhatsApp auth → GCS sync (hourly cron)
- [ ] Test WhatsApp session restore from GCS
- [ ] Update README with unified structure

### Phase 1: Fix Production (This Week)
| Task | Priority | Status |
|------|----------|--------|
| WhatsApp auth persistence across VM restarts | P0 | 🔧 Fixing |
| Fix alexa-handler unavailable clients (News, Reddit, Twitter, WhatsApp) | P1 | TODO |
| Enrich vault data sources | P1 | TODO |
| Clean orphaned Cloud Run services | P2 | TODO |
| Update docs/ to reflect current architecture | P2 | TODO |

### Phase 2: Deploy Enhanced Apps (This Month)
| Task | Priority | Status |
|------|----------|--------|
| Deploy Price Tracking ML | P2 | TODO |
| Deploy Story Narrator | P2 | TODO |
| Deploy Celebrity TTS | P3 | TODO |
| Deploy Email Intelligence | P3 | TODO |
| Deploy Analytics Dashboard | P3 | TODO |

### Phase 3: Polish (Ongoing)
| Task | Priority | Status |
|------|----------|--------|
| CI/CD pipeline (GitHub Actions) | P3 | TODO |
| Terraform IaC for infrastructure | P3 | TODO |
| Automated testing suite | P3 | TODO |
| Documentation cleanup | P3 | TODO |

---

## 📁 Directory Structure (Unified)

```
omniclaw-personal-assistant/          # Main repo (merged)
│
├── infrastructure/                  # Production infrastructure
│   ├── cloud-functions/
│   │   └── deploy/                  # alexa-handler (ACTIVE)
│   │       ├── index.js              # Main handler
│   │       ├── main.js               # Cloud Run entry
│   │       └── clients/              # 28 AI clients
│   ├── whatsapp-qr-cloud/            # WhatsApp service (VM-style)
│   │   ├── index.js                 # Main service
│   │   └── gcs_auth_state.js        # GCS auth sync
│   └── deployment/                   # Rollout docs + scripts
│
├── infrastructure-enhanced/          # Future infrastructure
│   ├── terraform/                   # IaC configs
│   ├── scripts/                     # Deployment scripts
│   └── cloud-functions/            # Enhanced functions
│
├── services/                        # Standalone services
│   ├── celebrity-tts-service/       # Voice cloning
│   ├── ml-analytics/                # ML models
│   ├── automation/                  # Workflow automation
│   └── api-gateway/                # API gateway
│
├── apps-enhanced/                   # Feature apps (future)
│   ├── price-tracking/             # ML price prediction
│   ├── story-narrator/             # AI TTS storytelling
│   ├── email-intelligence/         # Email AI
│   ├── analytics/                  # Real-time dashboard
│   ├── media-streaming/           # Spotify/YouTube
│   └── voice-studio/              # Voice cloning UI
│
├── apps/                           # Current apps (legacy)
│   └── story-narrator/           # Old story narrator
│
├── src/                            # Python ML code
│   ├── orchestration/             # HALO, MCTS, TMLPD agents
│   ├── memory/                   # Semantic + working memory
│   ├── workflows/                # Difficulty classifier
│   ├── providers/                # AI providers
│   └── skills/                  # TMLPD skill system
│
├── docs/                          # Current docs
│   ├── PROJECT_REVIEW_2026-04-24.md
│   └── ...
│
├── docs-enhanced/               # Enhanced project docs
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   └── ... (117 files)
│
└── BOOKMARKS.md                  # User bookmarks (actual content)
```

---

## 🔧 Active Production URLs

| Service | URL | Purpose |
|---------|-----|---------|
| WhatsApp | `34.100.240.249:9377` | Messaging + Vault |
| Alexa Handler | `https://alexa-handler-o36e7noe5a-el.a.run.app` | HALO AI |
| Vault Search | `https://omniclaw-vault-search-o36e7noe5a-el.a.run.app` | Knowledge Graph |
| Twitter Sync | `https://twitter-sync-o36e7noe5a-el.a.run.app` | Bookmark sync |
| Instagram Sync | `https://instagram-sync-o36e7noe5a-el.a.run.app` | Bookmark sync |

---

## 💾 Backup Strategy

| Data | Location | Backup |
|------|----------|--------|
| WhatsApp Auth | VM `/home/ubuntu/whatsapp-qr-cloud/whatsapp_auth/` | GCS hourly (`backups/`) |
| Knowledge Graph | `gs://omniclaw-knowledge-graph/` | Auto (versioning) |
| Vault Data | `gs://omniclaw-knowledge-graph/vault/` | Auto (versioning) |
| All Repos | GCS | `gs://omniclaw-backup-2026-04-24/` |

**GCS Backup Bucket**: `gs://omniclaw-backup-2026-04-24/`

---

## 🚨 Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| WhatsApp Cloud Run blocked by WA | HIGH | WORKAROUND: Using VM |
| 10 orphaned Cloud Run services | MEDIUM | TODO: Delete or find source |
| alexa-handler: 5 clients unavailable | MEDIUM | TODO: Fix clients |
| Vault has sparse data | MEDIUM | TODO: Enrich sources |
| browserless returns 404 | LOW | TODO: Find source or delete |

---

## 📋 Task Board

### 🔴 Critical (Fix Now)
- [ ] Test WhatsApp session restore from GCS backup
- [ ] Verify hourly cron sync is working
- [ ] Fix alexa-handler unavailable clients (5 clients down)

### 🟡 High Priority (This Week)
- [ ] Add more vault data sources
- [ ] Deploy Price Tracking ML from apps-enhanced/
- [ ] Update README with merged structure

### 🟢 Medium Priority (This Month)
- [ ] Deploy Story Narrator
- [ ] Deploy Celebrity TTS
- [ ] Set up CI/CD pipeline
- [ ] Terraform infrastructure-as-code

### ⚪ Low Priority (Backlog)
- [ ] Deploy Email Intelligence
- [ ] Deploy Analytics Dashboard
- [ ] Clean up docs/ directory

---

## 📋 Quick Commands

```bash
# Check WhatsApp status
curl http://34.100.240.249:9377/health

# Test vault query
curl -X POST http://34.100.240.249:9377/whatsapp/receive \
  -H "Content-Type: application/json" \
  -d '{"message": "^vault Python", "from": "test@s.whatsapp.net"}'

# Sync WhatsApp auth manually
gcloud compute ssh omniclaw-whatsapp --zone=asia-south1-b
sudo /usr/local/bin/whatsapp_gcs_sync.sh

# Backup to GCS
gsutil cp local-file.tar.gz gs://omniclaw-backup-2026-04-24/

# Deploy alexa-handler
cd infrastructure/cloud-functions/deploy
gcloud run deploy alexa-handler --source . --region asia-south1
```

---

## 📊 Task Board

### 🔴 Critical (Fix Now)
- [x] Test WhatsApp session restore from GCS backup → ✅ Connected, backup exists
- [x] **FIX: Set up hourly cron sync** → ✅ Done (hourly cron + test backup: 172K)
- [x] Fix alexa-handler unavailable clients → ✅ Down from 5 to 2 (TMLPDClient, BaileysWhatsAppClient)

### 🟡 High Priority (This Week)
- [x] Delete 10 orphaned Cloud Run services → ✅ Done (12 deleted)
- [x] Add more vault data sources → ✅ Added bookmarks_automated.json (5 sources now)
- [x] Update README with merged structure → ✅ Done (README updated, committed)
- [ ] Deploy Price Tracking ML → ✅ Source ready, needs Docker build
- [ ] Deploy Story Narrator → ✅ Source ready, needs Docker build
- [ ] Deploy Celebrity TTS → ✅ Source ready, Dockerfile exists

### 🟢 Medium Priority (This Month)
- [ ] Deploy Celebrity TTS → ⏳ Python build in progress (~10+ min)
- [ ] Deploy Story Narrator → 🔧 MODULE_NOT_FOUND - orchestrator imports broken
- [ ] Deploy Price Tracking → 🔧 SyntaxError in redis-streams-service.js
- [x] Set up CI/CD pipeline → ✅ GitHub Actions workflow created
- [x] Fix vault search endpoint → ✅ Vault works via `/` health endpoint
- [ ] Terraform infrastructure-as-code
- [ ] Clean up docs/ directory

### ⚪ Low Priority (Backlog)
- [ ] Deploy Email Intelligence
- [ ] Deploy Analytics Dashboard
- [ ] Multi-region deployment
- [ ] Advanced voice cloning
- [ ] Firestore schema design

---

## 🔗 Related Documents

- `docs/PROJECT_REVIEW_2026-04-24.md` - Detailed project analysis
- `docs-enhanced/ARCHITECTURE.md` - Full architecture reference
- `infrastructure/whatsapp-qr-cloud/HANDOVER.md` - WhatsApp service details
- `infrastructure/deployment/INDEX.md` - Deployment guide

---

**Last Updated**: 2026-04-24
**Next Review**: 2026-05-01
