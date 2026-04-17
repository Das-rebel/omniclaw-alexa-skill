#!/bin/bash
#
# OmniClaw Combined Scrape Script
# Runs Instagram + Twitter scrapers and uploads to GCS
# Scheduled daily at 8 AM UTC via /etc/cron.d/instatter
#

set -e

LOG_FILE="/opt/instatter/combined_scrape.log"
INSTAGRAM_SCRAPER="/opt/instatter/scraper.py"
TWITTER_SCRAPER="/opt/instatter/twitter_scraper.py"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Combined Scrape Started ==="

# Instagram
log "Instagram scrape..."
python3 "$INSTAGRAM_SCRAPER" >> /opt/instatter/instagram.log 2>&1 && log "Instagram: OK" || log "Instagram: FAILED"

# Twitter
log "Twitter scrape..."
python3 "$TWITTER_SCRAPER" >> /opt/instatter/twitter.log 2>&1 && log "Twitter: OK" || log "Twitter: FAILED"

log "=== Combined Scrape Done ==="
