# OmniCloud Tunnel

WhatsApp API via OpenClaw, exposed to Cloud Run via Cloudflare Tunnel.

## Architecture

```
Cloud Run ──► Cloudflare Tunnel ──► Mac API ──► OpenClaw ──► WhatsApp
```

## Setup

```bash
cd services/omniclaw-tunnel
./launch.sh
```

## Endpoints

- `GET /health` - Health check
- `POST /send` - Send WhatsApp message (body: `{to, message}`)
- `POST /process` - Get AI response + send reply (body: `{from, text}`)

## Cloudflare Tunnel URL

Tunnel URL changes each restart. Check `tunnel_url.txt` after launching.
