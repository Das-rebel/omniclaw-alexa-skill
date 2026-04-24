# OmniClaw Unified Project Review - 2026-04-24

## Executive Summary

This is a **bifurcated project** with two Git repos sharing one GCP project and one GCS bucket:

| Repo | Path | Size | Purpose | Git Remote |
|------|------|------|---------|------------|
| **omniclaw-personal-assistant** | `/Users/Subho/omniclaw-personal-assistant/` | 244MB | WhatsApp + Alexa voice, HALO orchestration | `Das-rebel/omniclaw-alexa-skill` |
| **omniclaw-enhanced** | `/Users/Subho/omniclaw-enhanced/` | 594MB | Full platform: price tracking, story narrator, analytics, celebrity TTS | *(standalone, not connected to git)* |

**Both repos deploy to the SAME Cloud Run project** (`omniclaw-personal-assistant`) and share the same GCS bucket (`omniclaw-knowledge-graph`).

---

## PART 1: UNIFIED INFRASTRUCTURE STATE

### Cloud Run Services (21 total) ✅ All Deployed

| Service | Health | Repo Source | Purpose | Status |
|---------|--------|------------|---------|--------|
| `alexa-handler` | ✅ 200 | `omniclaw-personal-assistant/` | Main brain - HALO + 20 AI clients | **PRODUCTION** |
| `whatsapp-qr-cloud` | ✅ 200 | `omniclaw-personal-assistant/` | WhatsApp QR (Cloud Run - broken) | Idle |
| `whatsapp-cloud` | ✅ 200 | `omniclaw-personal-assistant/` | WhatsApp Cloud Run (old) | Idle |
| `omniclaw-vault-search` | ✅ 200 | `omniclaw-personal-assistant/` | Knowledge graph + vault | **PRODUCTION** |
| `twitter-sync` | ✅ 200 | `omniclaw-personal-assistant/` | Twitter bookmark sync | Scheduler |
| `instagram-sync` | ✅ 200 | `omniclaw-personal-assistant/` | Instagram bookmark sync | Scheduler |
| `instagram-scraper` | ⚠️ Cold | `omniclaw-personal-assistant/` | IG content scraping | Scaled to 0 |
| `instagram-vault-scheduler` | ⚠️ Cold | `omniclaw-personal-assistant/` | IG → vault sync | Scaled to 0 |
| `bookmark-processor` | ✅ 200 | `omniclaw-personal-assistant/` | Bookmark processing | Scheduled |
| `bookmark-vault-scheduler` | ⚠️ Cold | `omniclaw-personal-assistant/` | Bookmark → vault | Scaled to 0 |
| `bookmark-vault-scheduler-instagram` | ⚠️ Cold | `omniclaw-personal-assistant/` | IG bookmark → vault | Scaled to 0 |
| `bookmark-vault-scheduler-twitter` | ⚠️ Cold | `omniclaw-personal-assistant/` | Twitter bookmark → vault | Scaled to 0 |
| `instatter` | ✅ 200 | `omniclaw-personal-assistant/` | Twitter/Insta analysis POC | Unknown |
| `instatter-browser` | ⚠️ Cold | `omniclaw-personal-assistant/` | Browser for instatter | Scaled to 0 |
| `instatter-sync` | ⚠️ Cold | `omniclaw-personal-assistant/` | Instatter data sync | Scaled to 0 |
| `cookierefresh` | ✅ 200 | `omniclaw-personal-assistant/` | Cookie refresh for scraping | Min instances |
| `browserless` | ⚠️ 404 | `omniclaw-personal-assistant/` | Browser automation | **BROKEN** |
| `omniclaw-alexa-handler` | ⚠️ Cold | `omniclaw-personal-assistant/` | Alternative Alexa | Scaled to 0 |
| `omniclaw-alexa-bridge` | ⚠️ Cold | `omniclaw-personal-assistant/` | Alexa bridge (old) | Scaled to 0 |
| `omniclaw-kgr-search` | ⚠️ Cold | `omniclaw-personal-assistant/` | Knowledge graph search | Scaled to 0 |
| `omniclaw-story-narrator` | ⚠️ Cold | `omniclaw-personal-assistant/` | AI story TTS narration | Scaled to 0 |

### Compute Engine VMs (2 total)

| VM | Zone | IP | Purpose | Source |
|----|------|-----|---------|--------|
| `omniclaw-whatsapp` | asia-south1-b | `34.100.240.249` | **PRODUCTION WhatsApp** (port 9377) | Local only |
| `instatter-vm` | asia-south1-b | `34.93.185.152` | Instatter POC | Local only |

### GCP Resources

| Resource | Status | Cost |
|----------|--------|------|
| Static IPs | `omniclaw-whatsapp` only | ~$7.30/mo |
| VPC Networks | `default` + `whatsapp-vpc` (orphaned) | Free |
| GCS Buckets | 9 total (4 system, 3 project) | Free |
| Cloud Scheduler | 2 jobs active | Free |
| Firestore | Empty (no data confirmed) | Free tier |

### Data Layer (GCS `omniclaw-knowledge-graph`)

| Data | Size | Contents |
|------|------|----------|
| **unified_knowledge_graph.json** | 14.7MB | Full knowledge graph |
| **vault/** | 4 files | instagram_saved, instagram_scrape, twitter_bookmarks, test4 |
| **vault/cookies/** | 2 files | Instagram + Twitter cookies for scraping |
| **Local bookmark_data/** | ~50MB | Duplicate/local copies of bookmarks |

---

## PART 2: REPO ANALYSIS

### Repo A: omniclaw-personal-assistant (244MB)

**Git Remote:** `Das-rebel/omniclaw-alexa-skill`
**Purpose:** WhatsApp + Alexa voice assistant, HALO orchestration

**Source Structure:**
```
omniclaw-personal-assistant/
├── infrastructure/
│   ├── cloud-functions/deploy/     ← alexa-handler source (PRODUCTION)
│   ├── whatsapp-qr-cloud/            ← WhatsApp service source
│   ├── deployment/                  ← Rollout docs + scripts
│   └── data/                        ← Data templates
├── src/                              ← Python ML/training code
│   ├── orchestration/               ← HALO/MCTS/TMLPD agents
│   ├── memory/                      ← Semantic + working memory
│   ├── workflows/                    ← Difficulty classifier, executors
│   ├── providers/                   ← AI providers (Cerebras, Gemini, etc.)
│   ├── skills/                      ← TMLPD skill system
│   └── agents/                      ← Skill-enhanced agents
├── docs/                             ← Architecture docs (28 files)
├── tests/                            ← Test suite
└── bookmark_data/                    ← Local bookmark copies
```

**Key Source Files:**
- `infrastructure/cloud-functions/deploy/index.js` - Main brain (AgentOrchestrator + ServiceMesh)
- `infrastructure/cloud-functions/deploy/main.js` - Cloud Run entry point
- `infrastructure/cloud-functions/deploy/clients/` - 28 client integrations
- `infrastructure/whatsapp-qr-cloud/index.js` - WhatsApp service

### Repo B: omniclaw-enhanced (594MB)

**Git Remote:** *(standalone, not pushed to git)*
**Purpose:** Full platform - price tracking, story narrator, analytics, celebrity TTS

**Source Structure:**
```
omniclaw-enhanced/
├── apps/                             ← Feature apps
│   ├── price-tracking/               ← ML price prediction (16 files)
│   ├── story-narrator/               ← AI TTS storytelling (14 files)
│   ├── analytics/                    ← Real-time dashboard
│   ├── email-intelligence/            ← Email AI (10 files)
│   ├── media-streaming/              ← Spotify/YouTube
│   └── voice-studio/                 ← Voice cloning
├── infrastructure/
│   ├── cloud-functions/              ← Functions source (NOT deployed?)
│   ├── terraform/                    ← IaC (11 files)
│   ├── scripts/                      ← Deployment scripts
│   └── security/                    ← Security configs
├── automation/                        ← Workflow automation
├── api-gateway/                       ← API gateway (164KB)
├── celebrity-tts-service/            ← Celebrity voice cloning (44KB)
├── ml-analytics/                      ← ML models (132KB)
├── shared/                            ← Shared code
├── docs/                              ← 10 implementation docs
└── (150+ MD files)                    ← COMPLETION, DEPLOYMENT, STATUS docs
```

**Key Apps:**
- `apps/price-tracking/` - ML-based price forecasting (buy/wait/hold)
- `apps/story-narrator/` - Multi-character TTS storytelling
- `apps/email-intelligence/` - Email summarization + calendar
- `apps/analytics/` - Real-time performance dashboard
- `celebrity-tts-service/` - ElevenLabs/Sarvam voice synthesis

### The Problem: Two Repos, One GCP Project

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GCP Project                                  │
│                  omniclaw-personal-assistant                        │
│                    (project #338789220059)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐        ┌───────────────────────────┐  │
│  │ omniclaw-personal-    │        │ omniclaw-enhanced          │  │
│  │ assistant/            │        │                           │  │
│  │ alexa-handler (✅)    │        │ price-tracking/ (NOT DEPLOYED) │
│  │ whatsapp-qr-cloud (✅) │        │ story-narrator/ (NOT DEPLOYED)│  │
│  │ vault-search (✅)     │        │ celebrity-tts/ (NOT DEPLOYED)  │  │
│  │                        │        │                           │  │
│  │ INFRA: cloud-functions/│        │ INFRA: infrastructure/    │  │
│  │         deploy/        │        │         cloud-functions/   │  │
│  └──────────┬───────────┘        └───────────┬───────────────┘  │
│             │                                  │                   │
│             │         GCS Bucket:              │                   │
│             └─────── omniclaw-knowledge-graph ─┘                   │
│                         (shared)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Critical Issue:** `omniclaw-enhanced` has ~594MB of code with **ZERO services deployed to Cloud Run**. All 150+ MD files describe features that were built but never deployed.

---

## PART 3: WHAT ACTUALLY WORKS (Production)

### ✅ Verified Working (April 24, 2026)

| Capability | Endpoint | Status |
|------------|-----------|--------|
| WhatsApp messaging | `34.100.240.249:9377` | ✅ Connected as `919003349852` |
| Vault search via WhatsApp | `^vault <query>` | ✅ Working |
| HALO AI orchestration | `alexa-handler` | ✅ 20/25 clients |
| Knowledge graph | `omniclaw-vault-search` | ✅ 23 clients |
| Twitter bookmark sync | Scheduler (3AM daily) | ✅ Active |
| Bookmark processing | Scheduler (10:30AM daily) | ✅ Active |
| Instagram sync | Scheduler | ✅ Active |
| Kodi control | Via alexa-handler | ✅ Working |
| Spotify control | Via alexa-handler | ✅ Working |
| Multi-language | en, hi, bn, hinglish | ✅ Working |

### ⚠️ Partially Working / Unknown

| Capability | Status | Issue |
|------------|--------|-------|
| WhatsApp Cloud Run | ❌ | WhatsApp blocks Cloud Run IPs (405/428) |
| Browserless | ⚠️ | Returns 404 |
| Instatter POC | ❓ | Returns 200 but function unknown |
| Celebrity TTS | ❓ | Never tested |
| Price tracking ML | ❓ | Never tested |
| Email intelligence | ❓ | Never tested |
| Story narrator | ⚠️ | Cold (may not start) |

---

## PART 4: DEAD CODE INVENTORY

### A. omniclaw-personal-assistant Dead Code

| Path | Size | Issue |
|------|------|-------|
| `whatsapp-qr-cloud/whatsapp_auth/` | ~50KB | Auth files (in git - should be in .gitignore) |
| `bookmark_data/` | ~50MB | Duplicate of GCS vault data |
| `knowledge_graph_data/` | ~10MB | Duplicate of GCS data |
| `docs/` (28 files, 125KB) | - | Many outdated docs from 2025 |
| `test_*.py/js` (root) | - | ✅ CLEANED in previous step |
| `ADVANCED_CAPABILITIES_*.md` | - | ✅ CLEANED in previous step |

### B. omniclaw-enhanced Dead Code

**This repo is entirely in a "built but never deployed" state.**

| Path | Size | Issue |
|------|------|-------|
| **ENTIRE REPO** | 594MB | Not connected to git. All services exist only locally. |
| `150+ *.md files` | ~5MB | COMPLETION, STATUS, DEPLOYMENT docs from March 2026 |
| `apps/email-intelligence/` | 10 files | Never tested/deployed |
| `apps/voice-studio/` | 3 files | Never tested/deployed |
| `apps/notifications/` | 3 files | Never tested/deployed |
| `apps/knowledge/` | 3 files | Never tested/deployed |
| `celebrity-tts-service/` | 44KB | Code exists but never deployed |
| `automation/` | 8KB | Never tested/deployed |
| `chaos/` | - | Chaos engineering (probably not production) |
| `ha/` | - | High availability configs |
| `compliance/` | - | Compliance docs |
| `capacity/` | - | Capacity planning |
| `multi-region/` | - | Multi-region configs |
| `profiler/` | - | Performance profiler |
| `service-mesh/` | - | Service mesh configs |
| `backup/`, `backups/` | - | Backup configs |

### C. Infrastructure Orphaning

| Service | Source Code | Status |
|---------|-------------|--------|
| `bookmark-vault-scheduler-*` | No local source | Orphaned |
| `instagram-vault-scheduler` | No local source | Orphaned |
| `instatter-browser` | No local source | Orphaned |
| `instatter-sync` | No local source | Orphaned |
| `omniclaw-alexa-handler` | No local source | Orphaned |
| `omniclaw-alexa-bridge` | No local source | Orphaned |
| `omniclaw-kgr-search` | No local source | Orphaned |
| `omniclaw-story-narrator` | No local source | Orphaned |

---

## PART 5: REVISED PROJECT PRD

### Project Vision (Unified)

> **"One AI assistant, multiple channels (WhatsApp, Alexa, Web), one vault that remembers everything, and smart automation for price tracking, social media, and media control."**

### What Users Actually Use

| Priority | Feature | Usage |
|----------|---------|-------|
| P0 | WhatsApp messaging + vault search | ✅ Daily |
| P1 | AI queries via Alexa/WhatsApp | ✅ Daily |
| P2 | Twitter/Instagram bookmark sync | ✅ Daily |
| P3 | Kodi/Spotify control | ✅ Occasional |
| P4 | Multi-language support | ✅ Hindi/Bengali |
| P5 | Price tracking | ❌ Never used |
| P6 | Story narration | ❌ Never used |
| P7 | Email intelligence | ❌ Never used |
| P8 | Celebrity TTS | ❌ Never used |

### What Gets Deleted

| What | Size Saved | Priority |
|------|-----------|----------|
| omniclaw-enhanced (entire repo) | 594MB | HIGH - no deployment, no git |
| omniclaw-personal-assistant/bookmark_data/ | ~50MB | MEDIUM - duplicate |
| omniclaw-personal-assistant/knowledge_graph_data/ | ~10MB | MEDIUM - duplicate |
| All orphan Cloud Run services (no source) | - | LOW - just delete service |

### What Gets Fixed / Completed

| What | Action | Effort |
|------|--------|--------|
| WhatsApp auth → GCS sync on VM | Complete the sync code, test persistence | 1h |
| Vault content enrichment | Add more sources (read-it-later, notes, etc.) | ongoing |
| alexa-handler unavailable clients | Fix News, Reddit, Twitter, WhatsApp clients | 2h |
| Browserless service | Find source code or delete service | 1h |
| README update | Reflect actual architecture | 1h |

---

## PART 6: UNIFIED TASK LIST

### 🔴 CRITICAL (Now)

| # | Task | Effort | Repo | Status |
|---|------|--------|------|--------|
| C1 | **Decide: merge or split** - omniclaw-enhanced has no git, no deployment | Decision | Both | TODO |
| C2 | **Sync WhatsApp auth to GCS on VM** - session lost on restart | 1h | PA | TODO |
| C3 | **Test celebrity-tts-service** or delete | 1h | Enhanced | TODO |
| C4 | **Test price-tracking** or delete | 1h | Enhanced | TODO |

### 🟡 HIGH PRIORITY (This Week)

| # | Task | Effort | Repo | Status |
|---|------|--------|------|--------|
| H1 | **Consolidate WhatsApp** - VM only, remove cloud versions | 1h | PA | TODO |
| H2 | **Enrich vault data** - add more sources | ongoing | PA | TODO |
| H3 | **Find browserless source** or delete service | 1h | PA | TODO |
| H4 | **Fix alexa-handler unavailable clients** (5 clients down) | 2h | PA | TODO |
| H5 | **Add WhatsApp auth to GCS** on VM restart | 1h | PA | TODO |

### 🟢 MEDIUM PRIORITY (This Month)

| # | Task | Effort | Repo | Status |
|---|------|--------|------|--------|
| M1 | **Consolidate infrastructure docs** - 1 README per repo | 2h | Both | TODO |
| M2 | **Clean omniclaw-enhanced** - delete if not deployable | 1h | Enhanced | TODO |
| M3 | **Delete bookmark_data/** (duplicate of GCS) | 30min | PA | TODO |
| M4 | **Delete knowledge_graph_data/** (duplicate of GCS) | 30min | PA | TODO |
| M5 | **Clean docs/ directory** - 28 docs, many outdated | 1h | PA | TODO |
| M6 | **Document VM startup** - auto-recovery script | 1h | PA | TODO |
| M7 | **Connect omniclaw-enhanced to git** or archive it | Decision | Enhanced | TODO |

### ⚪ LOW PRIORITY / BACKLOG

| # | Task | Effort | Repo | Status |
|---|------|--------|------|--------|
| L1 | Deploy story-narrator to Cloud Run | 2h | Enhanced | TODO |
| L2 | Deploy email-intelligence to Cloud Run | 2h | Enhanced | TODO |
| L3 | Deploy price-tracking ML to production | 2h | Enhanced | TODO |
| L4 | Set up Firestore schema | 2h | Both | TODO |
| L5 | Terraform infrastructure-as-code | 4h | PA | TODO |
| L6 | CI/CD pipeline (GitHub Actions) | 4h | Both | TODO |

---

## PART 7: CONSOLIDATION DECISION

### Option A: Keep Both Repos (Status Quo)

**Pros:**
- omniclaw-enhanced has future-ready apps (price tracking, TTS)
- Clean separation of concerns

**Cons:**
- omniclaw-enhanced not connected to git (all code at risk)
- omniclaw-enhanced has 0 services deployed (594MB wasted)
- Two repos deploy to same GCP project (confusing)
- No clear ownership

### Option B: Merge into Single Repo

**Pros:**
- Single source of truth
- Unified deployment
- Cleaner architecture

**Cons:**
- 838MB combined (594+244) is large
- Very different app types (voice assistant vs. price tracker)

### Option C: Archive omniclaw-enhanced

**Pros:**
- Stop maintaining dead code
- Focus resources on working services
- Save 594MB

**Cons:**
- Lose price tracking, celebrity TTS, email intelligence

### Option D: Extract enhanced services as separate project

**Pros:**
- Keep as separate project with own GCP project
- Clean separation

**Cons:**
- Would need new GCP project (cost)
- Migration effort

### Recommendation: **Option C (Archive)**

OmniClaw Enhanced's apps (price tracking, email, celebrity TTS) were built but never deployed or tested. Archive the repo with a note, and focus on making omniclaw-personal-assistant production-ready.

---

## PART 8: CLEANUP COMMANDS

### Archive omniclaw-enhanced

```bash
# Move to archive location
mkdir -p ~/omniclaw-archive
mv /Users/Subho/omniclaw-enhanced ~/omniclaw-archive/
echo "✅ omniclaw-enhanced archived"
```

### Clean omniclaw-personal-assistant

```bash
# Delete duplicate data directories
rm -rf /Users/Subho/omniclaw-personal-assistant/bookmark_data/
rm -rf /Users/Subho/omniclaw-personal-assistant/knowledge_graph_data/

# Clean outdated docs
rm -f /Users/Subho/omniclaw-personal-assistant/docs/ARCHITECTURAL-*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/COUNCIL_*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/LLM_*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/TMLPD_*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/V2_*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/VISIBILITY_*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/RESEARCH_*.md
rm -f /Users/Subho/omniclaw-personal-assistant/docs/IMPROVEMENT_*.md
# Keep only:
#   - PROJECT_REVIEW_2026-04-24.md
#   - CONFIGURATION.md
#   - QUICK_START_VISIBILITY.md (still relevant)
#   - TESTING_INDEX.md
#   - TEST_EXECUTION_CHECKLIST.md

# Delete orphaned Cloud Run services (find source first, or delete)
gcloud run services delete browserless --region=asia-south1 --quiet 2>/dev/null
```

### Delete orphaned services (if no source found)

```bash
# These have no local source code - safe to delete
for svc in bookmark-vault-scheduler bookmark-vault-scheduler-instagram bookmark-vault-scheduler-twitter instagram-vault-scheduler instatter-browser instatter-sync omniclaw-alexa-handler omniclaw-alexa-bridge omniclaw-kgr-search omniclaw-story-narrator; do
  gcloud run services delete $svc --region=asia-south1 --quiet 2>/dev/null && echo "Deleted $svc" || echo "Skipped $svc"
done
```

---

## Summary

| Metric | Value |
|--------|-------|
| **Working production services** | 6-7 |
| **Archived/deleted** | ~594MB (omniclaw-enhanced) + 60MB (duplicates) |
| **Orphaned services (no source)** | 10 (delete candidates) |
| **Immediate cost savings** | ~$7-102/month (deleted NAT, can delete cold services) |
| **High priority tasks** | 4 |
| **Medium priority tasks** | 7 |
| **Decision needed** | What to do with omniclaw-enhanced? |

---

**Next Step:** Decide on omniclaw-enhanced (archive or deploy), then run cleanup commands.
