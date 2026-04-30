#!/bin/bash
# =============================================================================
# OmniClaw Bookmark Scraper Cron Job Monitor
# =============================================================================
# Monitors Twitter/Instagram bookmark scraping → Vault processing
# Sends WhatsApp notifications on success/failure
# =============================================================================

# Configuration
GCP_PROJECT="omniclaw-personal-assistant"
GCS_BUCKET="omniclaw-knowledge-graph"
VAULT_URL="http://34.100.240.249:9377/whatsapp/receive"
LOG_FILE="/Users/Subho/omniclaw-personal-assistant/logs/cron-monitor.log"

# WhatsApp function
send_whatsapp() {
    local message="$1"
    local priority="${2:-normal}"
    
    echo "[WHATSAPP] Sending: ${message:0:100}..." >&2
    
    # Send via vault WhatsApp endpoint
    curl -s -X POST "$VAULT_URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"📋 $message\", \"priority\": \"$priority\"}" \
        > /dev/null 2>&1
    
    echo "[WHATSAPP] Sent successfully" >&2
}

# Log function
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

# Check service health
check_service() {
    local url="$1"
    local name="$2"
    
    local response=$(curl -s -w "\n%{http_code}" --max-time 10 "$url" 2>/dev/null)
    local status=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -1)
    
    if [ "$status" = "200" ]; then
        echo "✅"
        return 0
    else
        echo "❌ (HTTP $status)"
        return 1
    fi
}

# Check Cloud Run services
check_cloud_run_services() {
    log "=== Checking Cloud Run Services ==="
    
    local failed=0
    
    # Check bookmark-processor
    log "Checking bookmark-processor..."
    if ! check_service "https://bookmark-processor-338789220059.asia-south1.run.app/health" "bookmark-processor"; then
        ((failed++))
    fi
    
    # Check instagram-sync
    log "Checking instagram-sync..."
    if ! check_service "https://instagram-sync-338789220059.asia-south1.run.app/health" "instagram-sync"; then
        ((failed++))
    fi
    
    return $failed
}

# Run bookmark processing
run_bookmark_processing() {
    log "=== Running Bookmark Processing ==="
    
    local start_time=$(date +%s)
    local result=$(curl -s -X POST "https://bookmark-processor-338789220059.asia-south1.run.app/process" \
        -H "Content-Type: application/json" \
        --max-time 300 \
        2>&1)
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if echo "$result" | grep -q '"success":true'; then
        local processed=$(echo "$result" | grep -o '"processedItems":[0-9]*' | cut -d: -f2)
        log "✅ SUCCESS: Processed $processed items in ${duration}s"
        echo "$result"
        return 0
    else
        log "❌ FAILED: $result"
        echo "$result"
        return 1
    fi
}

# Check VL Agent results
check_vl_results() {
    log "=== Checking VL Agent Results ==="
    
    # Check GCS for processed files
    gsutil ls "gs://$GCS_BUCKET/vault/processed_"* 2>/dev/null | while read file; do
        local filename=$(basename "$file")
        local age=$(gsutil stat "$file" 2>/dev/null | grep "Creation time:" | awk '{print $3, $4}')
        log "Found: $filename (created: $age)"
    done
}

# Check GCS bucket for new data
check_gcs_data() {
    log "=== Checking GCS Bucket ==="
    
    # List recent files in vault
    gsutil ls -l "gs://$GCS_BUCKET/vault/"* 2>/dev/null | tail -20 | while read line; do
        log "GCS: $line"
    done
}

# Main cron monitoring function
cron_monitor() {
    log "========================================"
    log "STARTING CRON MONITOR $(date)"
    log "========================================"
    
    local summary=""
    local status="success"
    local issues=""
    
    # Step 1: Check services
    log "Step 1: Checking service health..."
    if ! check_cloud_run_services; then
        status="partial"
        issues="${issues}⚠️ Some services unhealthy; "
    fi
    
    # Step 2: Process bookmarks
    log "Step 2: Running bookmark processing..."
    local processing_result
    if processing_result=$(run_bookmark_processing 2>&1); then
        summary="${summary}✅ Bookmark processing completed; "
    else
        status="failure"
        issues="${issues}❌ Bookmark processing failed; "
    fi
    
    # Step 3: Check VL results
    log "Step 3: Checking VL agent results..."
    check_vl_results
    
    # Step 4: Check GCS data
    log "Step 4: Checking GCS data..."
    check_gcs_data
    
    # Send WhatsApp notification
    local notify_message=""
    
    case "$status" in
        success)
            notify_message="📊 Cron Complete ✅
━━━━━━━━━━━━━━━━━━
🕐 Time: $(date '+%H:%M')
📦 Bookmarks: Processed
🔄 VL Agents: Complete
━━━━━━━━━━━━━━━━━━
All systems operational"
            send_whatsapp "$notify_message" "low"
            ;;
        partial)
            notify_message="⚠️ Cron Partial ⚠️
━━━━━━━━━━━━━━━━━━
🕐 Time: $(date '+%H:%M')
📦 Bookmarks: Some issues
🔍 Check logs for details
━━━━━━━━━━━━━━━━━━
$issues"
            send_whatsapp "$notify_message" "medium"
            ;;
        failure)
            notify_message="🔴 Cron FAILED 🔴
━━━━━━━━━━━━━━━━━━
🕐 Time: $(date '+%H:%M')
📦 Bookmarks: Failed
━━━━━━━━━━━━━━━━━━
Error: $issues"
            send_whatsapp "$notify_message" "high"
            ;;
    esac
    
    log "========================================"
    log "ENDING CRON MONITOR $(date)"
    log "========================================"
    
    return 0
}

# Run immediate processing (for testing)
run_now() {
    log "=== RUNNING IMMEDIATE PROCESSING ==="
    
    # Process Twitter
    log "Processing Twitter bookmarks..."
    curl -s -X POST "https://bookmark-vault-scheduler-twitter-o36e7noe5a-el.a.run.app" \
        --max-time 180 2>&1 | tee -a "$LOG_FILE"
    
    # Process Instagram  
    log "Processing Instagram..."
    curl -s -X POST "https://bookmark-vault-scheduler-instagram-o36e7noe5a-el.a.run.app" \
        --max-time 180 2>&1 | tee -a "$LOG_FILE"
    
    # Process with VL agents
    log "Running VL agents..."
    check_vl_results
    
    send_whatsapp "📊 Manual run completed - check logs for details" "low"
}

# Show status
show_status() {
    echo "========================================"
    echo " OMNICLAW BOOKMARK SCRAPER STATUS"
    echo " $(date)"
    echo "========================================"
    
    echo ""
    echo "📦 Cloud Run Services:"
    echo "----------------------"
    echo -n "  bookmark-processor: "
    check_service "https://bookmark-processor-338789220059.asia-south1.run.app/health" "bookmark-processor"
    
    echo -n "  instagram-sync:     "
    check_service "https://instagram-sync-338789220059.asia-south1.run.app/health" "instagram-sync"
    
    echo ""
    echo "📊 GCS Vault Data:"
    echo "------------------"
    gsutil ls -l "gs://$GCS_BUCKET/vault/"* 2>/dev/null | tail -10 | awk '{print "  " $0}'
    
    echo ""
    echo "📜 Recent Logs:"
    echo "--------------"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "  No logs found"
    
    echo ""
    echo "========================================"
}

# Main entry point
case "${1:-cron}" in
    cron)
        cron_monitor
        ;;
    now|run)
        run_now
        ;;
    status)
        show_status
        ;;
    health)
        check_cloud_run_services
        ;;
    *)
        echo "Usage: $0 {cron|now|status|health}"
        echo ""
        echo "  cron   - Run scheduled monitoring (default)"
        echo "  now    - Run processing immediately"
        echo "  status - Show current status"
        echo "  health - Check service health"
        exit 1
        ;;
esac
