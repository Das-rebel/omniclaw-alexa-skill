# OmniCloud Tunnel v2.0

WhatsApp API via OpenClaw with Queue Management for reliability.

## Architecture

```
Cloud Run ──► Cloudflare Tunnel ──► Mac API ──► OpenClaw ──► WhatsApp
                    │                   │
                    └───────────────────┘
                         Queue Management
```

## Features

- **Auto-Queue**: Queries queued during service outages
- **Recovery**: Automatic processing when service resumes
- **Timestamps**: Users notified with original query times
- **Delay Messages**: Context-aware delayed response notifications

## Setup

```bash
cd services/omniclaw-tunnel
./launch.sh
```

## Endpoints

- `GET /health` - Health + queue status
- `POST /send` - Send WhatsApp (to, message)
- `POST /process` - Process query (auto-queues if service unavailable)
- `POST /queue/add` - Add query manually
- `POST /queue/recover` - Trigger recovery
- `GET /queue/summary` - Queue statistics
- `GET /queue/pending` - List pending queries

## Queue Behavior

1. User sends query via WhatsApp
2. If service unavailable → query queued with timestamp
3. When service recovers → queued queries processed
4. User receives delayed response with original timestamp
