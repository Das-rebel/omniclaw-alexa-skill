#!/bin/bash
# =============================================================================
# OmniClaw Bookmark Scraper & Vault Cron Job
# =============================================================================
# Features:
# - Twitter/Instagram bookmark scraping via Cloud Run
# - VL Agent processing for AI tagging
# - WhatsApp notifications on success/failure
# - GCS vault backup
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
GCP_PROJECT="omniclaw-personal-assistant"
GCS_BUCKET="omniclaw-knowledge-graph"
VAULT_WHATSAPP="http://34.100.240.249:9377/whatsapp/receive"
LOG_FILE="$PROJECT_DIR/logs/bookmark-cron.log"
STATUS_FILE="$PROJECT_DIR/logs/bookmark-status.json"

# Cloud Run URLs (corrected)
BOOKMARK_PROCESSOR_URL="https://bookmark-processor-o36e7noe5a-el.a.run.app"
INSTAGRAM_SYNC_URL="https://instagram-sync-o36e7noe5a-el.a.run.app"
VAULT_SEARCH_URL="https://omniclaw-vault-search-o36e7noe5a-el.a.run.app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# LOGGING
# ============================================================================

log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "${YELLOW}WARN${NC}" "$@"; }
log_error() { log "${RED}ERROR${NC}" "$@"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$@"; }

# ============================================================================
# WHATSAPP NOTIFICATIONS
# ============================================================================

send_whatsapp() {
    local message="$1"
    local emoji="${2:-📋}"
    local priority="${3:-normal}" # low, normal, high
    
    log_info "Sending WhatsApp: ${message:0:80}..."
    
    # Format message
    local formatted="${emoji} *Bookmark Cron*\n\n${message}"
    
    # Send via curl
    local response
    response=$(curl -s --max-time 30 \
        -X POST "$VAULT_WHATSAPP" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$formatted\", \"priority\": \"$priority\"}" 2>&1) || true
    
    # Log result
    if echo "$response" | grep -q "success\|ok\|sent"; then
        log_success "WhatsApp sent"
    else
        log_warn "WhatsApp response: $response"
    fi
}

# ============================================================================
# HEALTH CHECKS
# ============================================================================

check_service_health() {
    local url="$1"
    local name="$2"
    local timeout="${3:-10}"
    
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null) || status_code="000"
    
    if [ "$status_code" = "200" ]; then
        echo "✅"
        return 0
    else
        echo "❌ (HTTP $status_code)"
        return 1
    fi
}

check_all_services() {
    log_info "=== Checking Service Health ==="
    
    local all_healthy=true
    local service_status=""
    
    # Cloud Run services
    echo -n "  bookmark-processor: "
    if check_service_health "$BOOKMARK_PROCESSOR_URL/health" "bookmark-processor"; then
        service_status="${service_status}✅ bookmark-processor\n"
    else
        all_healthy=false
        service_status="${service_status}❌ bookmark-processor\n"
    fi
    
    echo -n "  instagram-sync: "
    if check_service_health "$INSTAGRAM_SYNC_URL/health" "instagram-sync"; then
        service_status="${service_status}✅ instagram-sync\n"
    else
        all_healthy=false
        service_status="${service_status}❌ instagram-sync\n"
    fi
    
    echo ""
    
    # Save status
    echo "{\"services_healthy\": $all_healthy, \"timestamp\": \"$(date -Iseconds)\"}" > "$STATUS_FILE"
    
    if $all_healthy; then
        return 0
    else
        return 1
    fi
}

# ============================================================================
# SCRAPER FUNCTIONS
# ============================================================================

run_twitter_scrape() {
    log_info "=== Running Twitter Bookmark Scrape ==="
    
    local start_time=$(date +%s)
    local response
    response=$(curl -s --max-time 300 \
        -X POST "https://bookmark-vault-scheduler-twitter-o36e7noe5a-el.a.run.app/twitter_scrape" \
        -H "Content-Type: application/json" 2>&1)
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "Twitter response: $response (${duration}s)"
    
    if echo "$response" | grep -q '"success":true'; then
        local count=$(echo "$response" | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
        echo "✅ Twitter: $count bookmarks in ${duration}s"
        return 0
    else
        echo "❌ Twitter failed: $response"
        return 1
    fi
}

run_instagram_scrape() {
    log_info "=== Running Instagram Bookmark Scrape ==="
    
    local start_time=$(date +%s)
    local response
    response=$(curl -s --max-time 300 \
        -X POST "https://bookmark-vault-scheduler-instagram-o36e7noe5a-el.a.run.app/instagram_scrape" \
        -H "Content-Type: application/json" 2>&1)
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "Instagram response: $response (${duration}s)"
    
    if echo "$response" | grep -q '"success":true'; then
        local count=$(echo "$response" | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
        echo "✅ Instagram: $count posts in ${duration}s"
        return 0
    else
        echo "❌ Instagram failed: $response"
        return 1
    fi
}

run_vl_processing() {
    log_info "=== Running VL Agent Processing ==="
    
    local start_time=$(date +%s)
    local response
    response=$(curl -s --max-time 300 \
        -X POST "$BOOKMARK_PROCESSOR_URL/process" \
        -H "Content-Type: application/json" 2>&1)
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "VL Processing response: $response (${duration}s)"
    
    if echo "$response" | grep -q '"success":true'; then
        local count=$(echo "$response" | grep -o '"processedItems":[0-9]*' | cut -d: -f2 || echo "0")
        echo "✅ VL Processing: $count items in ${duration}s"
        return 0
    else
        echo "⚠️ VL Processing: Response may need attention"
        return 0  # Don't fail the whole job for VL issues
    fi
}

# ============================================================================
# GCS BACKUP
# ============================================================================

backup_to_gcs() {
    log_info "=== Backing up to GCS ==="
    
    local backup_time=$(date +%Y%m%d_%H%M%S)
    local temp_dir="/tmp/bookmark-backup-$backup_time"
    
    mkdir -p "$temp_dir"
    
    # Download vault data
    gsutil -m cp -r "gs://$GCS_BUCKET/vault/"* "$temp_dir/" 2>/dev/null || true
    
    # Create backup
    local backup_file="$temp_dir/backup-$backup_time.tar.gz"
    tar -czf "$backup_file" -C "$temp_dir" . 2>/dev/null || true
    
    # Upload backup
    gsutil cp "$backup_file" "gs://$GCS_BUCKET/backups/backup-$backup_time.tar.gz" 2>/dev/null || true
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "Backup completed: gs://$GCS_BUCKET/backups/backup-$backup_time.tar.gz"
}

# ============================================================================
# MAIN CRON JOB
# ============================================================================

run_cron() {
    local start_time=$(date +%s)
    local overall_success=true
    local summary=""
    local issues=""
    
    echo ""
    log_info "=========================================="
    log_info " STARTING BOOKMARK CRON JOB $(date)"
    log_info "=========================================="
    
    # 1. Health Check
    echo ""
    log_info "Step 1: Service Health Check"
    if ! check_all_services; then
        overall_success=false
        issues="${issues}⚠️ Some services unhealthy; "
        send_whatsapp "⚠️ *Service Health Warning*

Some services may be down. Check logs.

🕐 Time: $(date '+%H:%M %d %b')" "⚠️" "high"
    fi
    
    # 2. Twitter Scrape
    echo ""
    log_info "Step 2: Twitter Bookmark Scrape"
    if ! run_twitter_scrape; then
        overall_success=false
        issues="${issues}❌ Twitter scrape failed; "
    fi
    
    # 3. Instagram Scrape
    echo ""
    log_info "Step 3: Instagram Bookmark Scrape"
    if ! run_instagram_scrape; then
        overall_success=false
        issues="${issues}❌ Instagram scrape failed; "
    fi
    
    # 4. VL Processing
    echo ""
    log_info "Step 4: VL Agent Processing"
    run_vl_processing  # Don't fail on VL issues
    
    # 5. GCS Backup
    echo ""
    log_info "Step 5: GCS Backup"
    backup_to_gcs
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    
    # 6. Send Summary
    echo ""
    log_info "Step 6: Sending Summary"
    
    local status_emoji="✅"
    local status_priority="low"
    
    if ! $overall_success; then
        status_emoji="❌"
        status_priority="high"
    fi
    
    local summary_message="📊 *Bookmark Cron Summary*

⏱️ Duration: ${duration_min}m ${duration_sec}s
${issues}

🕐 Next run: Hourly cron"

    send_whatsapp "$summary_message" "$status_emoji" "$status_priority"
    
    echo ""
    log_info "=========================================="
    if $overall_success; then
        log_success " CRON JOB COMPLETED SUCCESSFULLY (${duration_min}m ${duration_sec}s)"
    else
        log_error " CRON JOB COMPLETED WITH ISSUES (${duration_min}m ${duration_sec}s)"
        log_error " Issues: $issues"
    fi
    log_info "=========================================="
    echo ""
    
    return 0
}

# ============================================================================
# STATUS COMMAND
# ============================================================================

show_status() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE} OMNICLAW BOOKMARK SCRAPER STATUS${NC}"
    echo -e "${BLUE} $(date)${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
    
    echo -e "${GREEN}📦 Cloud Run Services:${NC}"
    echo "----------------------------------------"
    echo -n "   bookmark-processor: "
    check_service_health "$BOOKMARK_PROCESSOR_URL/health" "bookmark-processor"
    
    echo -n "   instagram-sync:     "
    check_service_health "$INSTAGRAM_SYNC_URL/health" "instagram-sync"
    
    echo ""
    echo -e "${GREEN}📊 GCS Vault Data:${NC}"
    echo "----------------------------------------"
    gsutil ls -l "gs://$GCS_BUCKET/vault/"* 2>/dev/null | tail -15 | sed 's/^/   /' || echo "   No data found"
    
    echo ""
    echo -e "${GREEN}📜 Recent Logs:${NC}"
    echo "----------------------------------------"
    tail -15 "$LOG_FILE" 2>/dev/null | sed 's/^/   /' || echo "   No logs found"
    
    echo ""
    echo -e "${BLUE}==========================================${NC}"
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

case "${1:-cron}" in
    cron)
        mkdir -p "$(dirname "$LOG_FILE")"
        run_cron
        ;;
    status)
        show_status
        ;;
    health)
        check_all_services
        ;;
    twitter)
        run_twitter_scrape
        ;;
    instagram)
        run_instagram_scrape
        ;;
    vl|process)
        run_vl_processing
        ;;
    backup)
        backup_to_gcs
        ;;
    test-whatsapp)
        send_whatsapp "🧪 *Test Message*

This is a test from bookmark cron.

✅ If you see this, WhatsApp notifications are working!

🕐 Time: $(date '+%H:%M %d %b')" "📋" "normal"
        ;;
    *)
        echo "Usage: $0 {cron|status|health|twitter|instagram|vl|backup|test-whatsapp}"
        echo ""
        echo "Commands:"
        echo "  cron          - Run full cron job (default)"
        echo "  status        - Show current status"
        echo "  health        - Check service health"
        echo "  twitter       - Run Twitter scrape only"
        echo "  instagram     - Run Instagram scrape only"
        echo "  vl|process    - Run VL agent processing only"
        echo "  backup        - Backup vault to GCS"
        echo "  test-whatsapp - Send test WhatsApp message"
        exit 1
        ;;
esac
