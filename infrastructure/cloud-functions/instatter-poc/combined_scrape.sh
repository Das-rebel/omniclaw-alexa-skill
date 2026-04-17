#!/bin/bash
#
# OmniClaw Combined Scrape + VL Processor Script
# Runs scrapers then VL enrichment, uploads to GCS
# Scheduled daily at 8 AM via /etc/cron.d/instatter
#

set -e

INSTAGRAM_SCRAPER="/opt/instatter/scraper.py"
TWITTER_SCRAPER="/opt/instatter/twitter_scraper.py"
VL_PROCESSOR="/opt/instatter/vl_processor.js"

echo "[$(date)] === Combined Scrape Started ==="

# Instagram
echo "[$(date)] Instagram scrape..."
python3 "$INSTAGRAM_SCRAPER" >> /opt/instatter/instagram.log 2>&1 && echo "[$(date)] Instagram: OK" || echo "[$(date)] Instagram: FAILED"

# Twitter
echo "[$(date)] Twitter scrape..."
python3 "$TWITTER_SCRAPER" >> /opt/instatter/twitter.log 2>&1 && echo "[$(date)] Twitter: OK" || echo "[$(date)] Twitter: FAILED"

# VL Processing (both platforms)
echo "[$(date)] VL processing..."
AI_PROVIDER=groq node "$VL_PROCESSOR" >> /opt/instatter/vl.log 2>&1 && echo "[$(date)] VL: OK" || echo "[$(date)] VL: FAILED"

echo "[$(date)] === Combined Scrape Done ==="
