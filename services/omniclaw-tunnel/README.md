# OmniCloud Tunnel v2.0

WhatsApp API via OpenClaw with Queue Management and Resilience DB.

## Architecture

```
Cloud Run ──► Cloudflare Tunnel ──► Mac API ──► OpenClaw ──► WhatsApp
                    │                   │
                    └───────────────────┘
                    Queue + Resilience DB
```

## Resilience DB

SQLite database at `db/omniclaw.db` that persists:
- **contacts**: All WhatsApp JIDs with names, last seen, interaction count
- **groups**: All group JIDs with names and descriptions
- **accounts**: Linked device accounts
- **interactions**: Full log of all inbound/outbound messages
- **queue**: Pending/unanswered messages with timestamps
- **service_health**: Service outage tracking

### Known Groups
| JID | Name | Status |
|-----|------|--------|
| 120363141914506124@g.us | AI and Embedded | ✅ Working |
| 120363358972347979@g.us | Unknown | ❌ item-not-found |
| 120363404584160486@g.us | Unknown | Untested |

## Setup

```bash
cd services/omniclaw-tunnel

# Initialize DB
python3 db/resilience_db.py init
python3 db/resilience_db.py seed

# Start everything
./launch.sh
```

## Endpoints

- `GET /health` - Health + queue + DB status
- `POST /send` - Send WhatsApp (to, message)
- `POST /process` - Process query (auto-queues if service unavailable)
- `POST /queue/add` - Add query manually
- `POST /queue/recover` - Trigger recovery
- `GET /db/contacts` - List all known contacts
- `GET /db/groups` - List all known groups
- `GET /db/summary` - Full DB export

## CLI

```bash
python3 db/resilience_db.py init      # Create tables
python3 db/resilience_db.py seed      # Load known data
python3 db/resilience_db.py contacts  # List contacts
python3 db/resilience_db.py groups    # List groups
python3 db/resilience_db.py summary   # DB summary
python3 db/resilience_db.py export    # Full JSON export
```
