# OmniClaw Project Review - 2026-04-24

## Executive Summary

OmniClaw is a **production-grade personal assistant** connecting multiple platforms (Alexa, WhatsApp, Web) to AI providers with vault-based knowledge management. The system is **operationally functional** but has accumulated significant technical debt through rapid iteration.

---

## PART 1: CURRENT STATE ASSESSMENT

### ✅ What Works

| Component | Status | Notes |
|-----------|--------|-------|
| WhatsApp VM (`omniclaw-whatsapp`) | ✅ Active | Connected as `919003349852` (Subhajit), vault routing fixed |
| WhatsApp Cloud Run | ⚠️ Broken | 405 errors - WhatsApp blocks Cloud Run IPs |
| `alexa-handler` (main brain) | ✅ Active | 20/25 clients working, routes intents |
| `omniclaw-vault-search` | ✅ Active | 23 clients, vault queries working |
| Vault data (GCS) | ✅ Has data | 14.7MB unified knowledge graph, 4 vault sources |
| Bookmark sync | ✅ Scheduled | Twitter sync daily @ 3AM, bookmark processing @ 10:30AM |
| TMLPD client | ✅ Working | Task-guided memory compression |
| Multi-language | ✅ Supported | English, Hindi, Bengali, Hinglish |
| Multi-provider AI | ✅ 20+ providers | Gemini, Groq, Cerebras, Perplexity, etc. |

### ⚠️ Partial / Degraded

| Component | Status | Notes |
|-----------|--------|-------|
| Cloud Run WhatsApp | ❌ Dead | WhatsApp blocks Cloud Run IPs (405/428 errors) |
| Cloud NAT + Static IP | 💸 Waste | $65-110/month, doesn't solve WhatsApp issue |
| `whatsapp-cloud` (old) | ⚠️ Idle | Not connected, no QR generated |
| 11 services scaled to 0 | ⏸️ Cold | bookmark-vault-schedulers, instagram-vault-scheduler, etc. |
| WhatsApp session storage | ⚠️ Mixed | GCS sync written but not tested on VM |
| Browserless | ⚠️ Unknown | Returns 404 - may be broken |

### ❌ Broken / Missing

| Component | Status | Notes |
|-----------|--------|-------|
| `instatter` | ❌ Unknown | Returns 200 but may not function |
| `omniclaw-alexa-bridge` | ❌ Cold start | Timed out health check |
| `omniclaw-kgr-search` | ❌ Cold start | Timed out health check |
| `omniclaw-story-narrator` | ❌ Cold start | Timed out health check |
| Firestore collections | ❓ Unknown | No data confirmed |
| Pai integration | ❓ Unknown | Not tested |
| XMCP integration | ❓ Unknown | Not tested |

---

## PART 2: INFRASTRUCTURE AUDIT

### Cloud Run Services (21 total)

| Service | Health | Cost Driver | Source Code |
|--------|--------|-------------|-------------|
| `alexa-handler` | ✅ 200 | min instances | `infrastructure/cloud-functions/deploy/` |
| `bookmark-processor` | ✅ 200 | min instances | Missing local code |
| `whatsapp-cloud` | ✅ 200 | idle | Missing local code |
| `whatsapp-qr-cloud` | ✅ 200 | idle | `infrastructure/whatsapp-qr-cloud/` |
| `omniclaw-vault-search` | ✅ 200 | min instances | Missing local code |
| `twitter-sync` | ✅ 200 | scheduler-driven | Missing local code |
| `instagram-sync` | ✅ 200 | scheduler-driven | Missing local code |
| `instatter` | ✅ 200 | min instances | Missing local code |
| `cookierefresh` | ✅ 200 | min instances | Missing local code |
| `browserless` | ⚠️ 404 | min instances | Missing local code |
| `omniclaw-alexa-handler` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `omniclaw-alexa-bridge` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `bookmark-vault-scheduler` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `bookmark-vault-scheduler-instagram` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `bookmark-vault-scheduler-twitter` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `instagram-scraper` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `instagram-vault-scheduler` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `instatter-browser` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `instatter-sync` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `omniclaw-kgr-search` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |
| `omniclaw-story-narrator` | ⏸️ TIMEOUT | scaled to 0 | Missing local code |

### Compute Engine VMs (3 total)

| VM | IP | Status | Notes |
|----|----|--------|-------|
| `omniclaw-whatsapp` (asia-south1-b) | `34.100.240.249` | ✅ Running | **Production WhatsApp** - port 9377 |
| `omniclaw-whatsapp` (asia-south1-a) | `34.47.155.166` | ⚠️ Idle | Has code but not running |
| `instatter-vm` | `34.93.185.152` | ✅ Running | Instatter POC |

### Cloud NAT / VPC (DEAD - cleanup candidate)

| Resource | Cost/month | Status |
|----------|-----------|--------|
| `whatsapp-static-ip` (`34.14.129.187`) | ~$7 | IN_USE (unused) |
| `whatsapp-nat-router` | ~$45-65 | Empty (no VMs attached) |
| `whatsapp-nat` | included | Empty |
| `whatsapp-vpc` | free | Unused |
| `whatsapp-subnet` | free | Unused |
| `whatsapp-connector` | ~$15-30 | IN_USE by Cloud Run (but useless) |

### GCS Buckets

| Bucket | Size | Contents |
|--------|------|---------|
| `omniclaw-knowledge-graph` | ~15MB | Vault data, unified KG, auth state |
| `omniclaw-deployment-stage` | ? | Deployment artifacts |
| 4x gcf-v2-* | System | GCP internal |

### Schedulers

| Job | Schedule | Status |
|-----|----------|--------|
| `bookmark-processing-daily` | 30 10 * * * | ENABLED |
| `twitter-sync-daily` | 0 3 * * * | ENABLED |

---

## PART 3: ARCHITECTURE ANALYSIS

### Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTS                          │
│   Alexa  │  WhatsApp  │  Web  │  REST API         │
└────┬──────────┬──────────────┬──────────────────────┘
     │          │              │
     ▼          ▼              ▼
┌─────────────────────────────────────────────────────┐
│              alexa-handler (main)                    │
│  ┌────────────────────────────────────────────────┐ │
│  │  AgentOrchestrator (HALO)                       │ │
│  │  ├── PersonaGenerator                           │ │
│  │  ├── ServiceMesh (25 clients)                    │ │
│  │  ├── AttentionWeightedMemory                     │ │
│  │  ├── TaskGuidedCompressor                        │ │
│  │  └── StoryOrchestrator                           │ │
│  └────────────────────────────────────────────────┘ │
└─────────────┬──────────────────────┬─────────────────┘
              │                      │
              ▼                      ▼
┌──────────────────────┐   ┌──────────────────────────┐
│  omniclaw-vault-search │   │  whatsapp-cloud (old)     │
│  (Knowledge Graph)     │   │  whatsapp-qr-cloud (new)  │
└──────────────────────┘   └───────────┬──────────────┘
                                       │
        ┌──────────────────────────────┘
        ▼
┌─────────────────────────────┐
│  omniclaw-whatsapp (VM)      │  ← PRODUCTION WHATSAPP
│  34.100.240.249:9377        │
└─────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              SCHEDULED JOBS                         │
│  twitter-sync-daily  │  bookmark-processing-daily   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              DATA LAYER                             │
│  GCS: vault/  unified_knowledge_graph  whatsapp_auth │
│  Local: bookmark_data/  knowledge_graph_data/        │
└─────────────────────────────────────────────────────┘
```

### Issues Identified

1. **WhatsApp on VM is the working solution** - Cloud Run WhatsApp is dead
2. **Static IP infrastructure is wasted money** - Cloud NAT doesn't bypass WhatsApp blocking
3. **16 of 21 Cloud Run services have no local source code** - deployed once and forgotten
4. **alexa-handler is the single point of failure** - all intents route through it
5. **Multiple "v2" initiatives** - OMNICLAW_2_0_COMPLETE.md says all done, but many services are cold/dead
6. **Old WhatsApp services still deployed** - `whatsapp-cloud` and `whatsapp-qr-cloud` both exist
7. **Vault data is sparse** - only 4 sources (instagram_saved, instagram_scrape, twitter_bookmarks, test4)

---

## PART 4: DEAD CODE IDENTIFICATION

### Orphaned Directories (no deployable source)

```
infrastructure/cloud-functions/instatter-poc/      - POC, not production
infrastructure/cloud-functions/twitter-sync-function/ - superseded by deploy/
infrastructure/cloud-functions/instagram-sync-function/ - superseded by deploy/
infrastructure/vault-search-service/                 - old version
infrastructure/firestore/                           - empty
infrastructure/monitoring/                          - empty
infrastructure/terraform/                          - no terraform files
infrastructure/kodi-relay/                          - empty
```

### Stale Auth/Config Directories

```
whatsapp_auth_session/     - empty auth session
whatsapp_fieldtheory_auth/ - empty auth session  
preserved/                 - old interaction_model (unused)
pai/                       - pai integration (untested)
xmcp/                      - xmcp integration (untested)
```

### Stale Test Files (at repo root)

```
test_advanced_capabilities.js     - one-time test
test_integration_simple.py        - one-time test
test_mcts_workflow.py             - one-time test
test_performance_analytics.js      - one-time test
test_templd_integration.py        - one-time test
test_universal_router.py          - one-time test
test_results_summary.txt         - historical
performance_validation_results.json - historical
```

### Outdated Documentation

```
OMNICLAW_2_0_COMPLETE.md            - 2025-04-19 (outdated PRD)
ADVANCED_CAPABILITIES_TEST_REPORT.md - 2025-04-20 (historical)
ADVANCED_CAPABILITIES_EXECUTIVE_SUMMARY.md - 2025-04-20 (historical)
```

### Cloud Run Services with No Local Code

| Service | Risk |
|---------|------|
| `bookmark-processor` | Cannot redeploy |
| `bookmark-vault-scheduler*` | Cannot redeploy |
| `instagram-*` services | Cannot redeploy |
| `instatter-browser` | Cannot redeploy |
| `instatter-sync` | Cannot redeploy |
| `omniclaw-alexa-handler` | Cannot redeploy |
| `omniclaw-alexa-bridge` | Cannot redeploy |
| `omniclaw-kgr-search` | Cannot redeploy |
| `omniclaw-story-narrator` | Cannot redeploy |
| `browserless` | Cannot redeploy |

---

## PART 5: PROJECT PRD (RETHINK)

### Core Vision (What OmniClaw Actually Does)

> **"Your personal AI assistant that lives in WhatsApp and Alexa, remembers everything via your vault, and can control your home media."**

### What Users Actually Want

| Priority | Feature | Channel | Status |
|----------|---------|---------|--------|
| 1 | WhatsApp messaging + vault search | WhatsApp | ✅ Working |
| 2 | Natural language commands | WhatsApp/Alexa | ✅ Working |
| 3 | Bookmark & content vault | All | ⚠️ Sparse |
| 4 | Media control (Kodi, Spotify) | WhatsApp/Alexa | ✅ Working |
| 5 | Twitter/Instagram sync | Background | ✅ Scheduled |
| 6 | Voice control | Alexa | ✅ Working |
| 7 | Multi-language | WhatsApp/Alexa | ✅ Working |
| 8 | Story narration | WhatsApp | ⏸️ Cold |
| 9 | Home automation (Hue) | WhatsApp/Alexa | ❌ Config missing |

### What Users DON'T Need (Or Never Used)

- Instatter POC (completely unused)
- Pai integration (never tested)
- XMCP integration (never tested)
- Fieldtheory auth (empty)
- Cloud Run WhatsApp (WhatsApp blocks it)
- Static IP via NAT (doesn't help anyway)

### Revised Core Capabilities

| Capability | Status | Priority |
|------------|--------|----------|
| WhatsApp messaging | ✅ VM | P0 |
| Vault search (`^vault`) | ✅ Fixed | P0 |
| AI routing (20+ providers) | ✅ | P0 |
| Bookmark sync (Twitter/Instagram) | ✅ | P1 |
| Kodi control | ✅ | P1 |
| Spotify control | ✅ | P1 |
| Multi-language | ✅ | P1 |
| Alexa voice | ✅ | P2 |
| Story narration | ⏸️ | P3 |
| Home automation | ❌ | P3 |

---

## PART 6: TASK PRIORITIZATION

### 🔴 CRITICAL (Fix Now)

| # | Task | Effort | Owner | Status |
|---|------|--------|-------|--------|
| C1 | **Clean up Cloud NAT / Static IP infrastructure** - saves $65-110/month | 30min | CLI | TODO |
| C2 | **Sync WhatsApp auth to GCS on VM** - persist session across VM restarts | 30min | CLI | TODO |
| C3 | **Test Pai integration** or document it as deprecated | 1h | CLI | TODO |
| C4 | **Update HANDOVER.md for whatsapp-qr-cloud** with current state | 15min | CLI | DONE |

### 🟡 HIGH PRIORITY (This Week)

| # | Task | Effort | Owner | Status |
|---|------|--------|-------|--------|
| H1 | **Consolidate WhatsApp services** - keep VM only, remove cloud versions | 1h | CLI | TODO |
| H2 | **Add vault content** - more sources to make vault useful | ongoing | CLI | TODO |
| H3 | **Test and document** `omniclaw-story-narrator` or delete it | 1h | CLI | TODO |
| H4 | **Backup VM auth state** - WhatsApp session must survive VM reboot | 30min | CLI | TODO |
| H5 | **Fix alexa-handler unavailable clients** (News, Reddit, Twitter, WhatsApp) | 2h | CLI | TODO |

### 🟢 MEDIUM PRIORITY (This Month)

| # | Task | Effort | Owner | Status |
|---|------|--------|-------|--------|
| M1 | **Find source code** for 10+ orphaned Cloud Run services | 3h | CLI | TODO |
| M2 | **Write consolidated PRD** (replace all 4 outdated docs) | 2h | CLI | TODO |
| M3 | **Clean up dead code** (orphaned dirs, stale test files) | 2h | CLI | TODO |
| M4 | **Update README** to reflect actual architecture | 1h | CLI | TODO |
| M5 | **Document VM startup script** - make WhatsApp service auto-recover | 1h | CLI | TODO |
| M6 | **Test all Cloud Run services** and create status page | 2h | CLI | TODO |

### ⚪ LOW PRIORITY / BACKLOG

| # | Task | Effort | Owner | Status |
|---|------|--------|-------|--------|
| L1 | Restore Pai integration testing | 2h | CLI | TODO |
| L2 | XMCP integration | 4h | CLI | TODO |
| L3 | Firestore collections - define schema | 2h | CLI | TODO |
| L4 | Terraform for infrastructure-as-code | 4h | CLI | TODO |
| L5 | Hue home automation configuration | 1h | CLI | TODO |

---

## PART 7: CLEANUP COMMANDS

### Immediate Cleanup (Run Now)

```bash
# 1. Delete unused Cloud NAT infrastructure (saves ~$65-110/month)
gcloud compute routers nats delete whatsapp-nat \
  --router=whatsapp-nat-router --region=asia-south1 --quiet
gcloud compute routers delete whatsapp-nat-router --region=asia-south1 --quiet
gcloud compute networks vpc-access connectors delete whatsapp-connector \
  --region=asia-south1 --quiet
gcloud compute addresses delete whatsapp-static-ip --region=asia-south1 --quiet
gcloud compute networks subnets delete whatsapp-subnet --region=asia-south1 --quiet
gcloud compute networks delete whatsapp-vpc --quiet

# 2. Delete idle VM in asia-south1-a
gcloud compute instances delete omniclaw-whatsapp --zone=asia-south1-a --quiet

# 3. Scale down unused Cloud Run services
gcloud run services update instagram-scraper --region=asia-south1 --min-instances=0
gcloud run services update instagram-vault-scheduler --region=asia-south1 --min-instances=0
gcloud run services update instatter-browser --region=asia-south1 --min-instances=0
gcloud run services update instatter-sync --region=asia-south1 --min-instances=0
gcloud run services update omniclaw-kgr-search --region=asia-south1 --min-instances=0
gcloud run services update omniclaw-story-narrator --region=asia-south1 --min-instances=0
```

### Safe to Delete (Orphaned Code)

```bash
# These have no corresponding deployed service
rm -rf infrastructure/instatter-poc/
rm -rf infrastructure/vault-search-service/
rm -rf infrastructure/firestore/
rm -rf infrastructure/monitoring/
rm -rf infrastructure/terraform/
rm -rf infrastructure/kodi-relay/

# These are empty/stale
rm -rf whatsapp_auth_session/
rm -rf whatsapp_fieldtheory_auth/
rm -rf preserved/
rm -rf pai/
rm -rf xmcp/

# Stale test files
rm -f test_*.js test_*.py test_*.txt performance_*.json

# Outdated docs
rm -f OMNICLAW_2_0_COMPLETE.md
rm -f ADVANCED_CAPABILITIES_*.md
```

---

## PART 8: REVISED ARCHITECTURE (TARGET)

### What Survives

```
┌─────────────────────────────────────────────────────┐
│  CLIENTS: Alexa, WhatsApp (VM), Web                │
└────┬──────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  alexa-handler (Cloud Run)                          │
│  - AgentOrchestrator (HALO)                         │
│  - ServiceMesh (25 clients)                          │
│  - VaultIntent → omniclaw-vault-search              │
│  - WhatsAppIntent → omniclaw-whatsapp (VM)           │
└─────┬───────────────────────────────────────────────┘
      │
      ▼                              ▼
┌──────────────────────┐   ┌────────────────────────┐
│  omniclaw-vault-     │   │  omniclaw-whatsapp     │
│  search (Cloud Run)  │   │  (VM, asia-south1-b)   │
│                      │   │  34.100.240.249:9377  │
│  - Knowledge Graph   │   │  - WhatsApp connected  │
│  - Bookmark sync     │   │  - Vault routing       │
│  - 23 working clients│   │  - GCS auth sync       │
└──────────────────────┘   └────────────────────────┘

SCHEDULED: twitter-sync-daily, bookmark-processing-daily
DATA: GCS bucket (vault/, unified_knowledge_graph.json)
```

### What Gets Deleted

| Resource | Monthly Savings |
|----------|----------------|
| Cloud NAT + VPC + Connector | ~$65-110 |
| Idle VM (asia-south1-a) | ~$7-15 |
| Cold Cloud Run services | ~$0 (already at 0 instances) |
| **Total** | **~$72-125/month** |

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Working production services | 6 | Maintain |
| Dead services to clean up | 15 | Delete or find source |
| Dead infrastructure to clean up | 1 | Delete NAT/VPC |
| Dead directories to clean up | 9 | Delete |
| Stale test files to clean up | 7 | Delete |
| Immediate cost savings | ~$72-125/month | Delete NAT/VPC |
| Critical fixes needed | 4 | Do now |
| High priority tasks | 5 | This week |
| Medium priority tasks | 6 | This month |

---

**Next Step:** Run the cleanup commands in PART 7, then tackle H1-H5 from PART 6.
