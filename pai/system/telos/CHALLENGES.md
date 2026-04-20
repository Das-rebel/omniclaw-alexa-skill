# CHALLENGES

## Current Blockers
- [ ] WhatsApp Baileys session management reliability
- [ ] Twitter/Instagram scraper VM maintenance
- [ ] Bookmark vault VL processing latency

## Known Technical Debt
- index.js Cloud Function is 75KB (needs modularization)
- skill_manager.py lacks CODE tier resolution
- No explicit hook system for lifecycle events

## External Dependencies
- ElevenLabs API reliability (TTS)
- Spotify API rate limits
- GCP Cloud Functions cold starts
