#!/bin/bash
#
# OmniClaw Combined Scrape Script
# Runs Instagram + Twitter scrapers and uploads to GCS
# Scheduled daily at 8 AM UTC via /etc/cron.d/instatter
#

set -e

INSTAGRAM_SCRAPER="/opt/instatter/scraper.py"
TWITTER_SCRAPER="/opt/instatter/twitter_scraper.py"

echo "[$(date)] === Combined Scrape Started ==="

# Instagram
echo "[$(date)] Instagram scrape..."
python3 "$INSTAGRAM_SCRAPER" >> /opt/instatter/instagram.log 2>&1 && echo "[$(date)] Instagram: OK" || echo "[$(date)] Instagram: FAILED"

# Twitter
echo "[$(date)] Twitter scrape..."
python3 "$TWITTER_SCRAPER" >> /opt/instatter/twitter.log 2>&1 && echo "[$(date)] Twitter: OK" || echo "[$(date)] Twitter: FAILED"

echo "[$(date)] === Combined Scrape Done ==="
