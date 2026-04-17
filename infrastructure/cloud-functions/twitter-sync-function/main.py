# Twitter Bookmark Sync via Cloud Functions
# Runs on Google Cloud Platform - fully automated!

import os
import json
from datetime import datetime
import functions_framework

try:
    from google.cloud import storage
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    print("google-cloud-storage not available")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("requests not available")

# Configuration
BUCKET_NAME = "omniclaw-knowledge-graph"
TWITTER_USERNAME = "sdas22"
NITTER_URL = "https://nitter.net"

@functions_framework.http
def fetch_twitter_bookmarks(request):
    """
    HTTP Cloud Function
    Fetches Twitter bookmarks via Nitter and uploads to GCS
    Triggered by HTTP request or Cloud Scheduler
    """
    # CORS headers
    if request.method == 'OPTIONS':
        headers = {'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type'}
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*',
               'Content-Type': 'application/json'}

    # Health check endpoint (GET only)
    if request.method == 'GET' and (request.path == '/health' or request.path == '/'):
        return json.dumps({
            "service": "twitter-sync",
            "status": "healthy",
            "timestamp": datetime.now().isoformat()
        }), 200, headers

    try:
        print(f"[{datetime.now().isoformat()}] Fetching Twitter bookmarks for {TWITTER_USERNAME}")

        # Fetch from Nitter (open source Twitter frontend)
        nitter_url = f"{NITTER_URL}/{TWITTER_USERNAME}/bookmarks"

        if not REQUESTS_AVAILABLE:
            return json.dumps({
                "error": "requests library not available",
                "solution": "Add 'requests' to requirements.txt"
            }), 500, headers

        response = requests.get(
            nitter_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout=30
        )

        if response.status_code == 200:
            html = response.text
            bookmarks = parse_nitter_bookmarks(html)

            # Upload to GCS
            if GCS_AVAILABLE:
                upload_to_gcs('vault/twitter_bookmarks_automated.json', bookmarks)

            print(f"✅ Successfully processed {len(bookmarks)} bookmarks")

            return json.dumps({
                "success": True,
                "count": len(bookmarks),
                "source": "nitter",
                "timestamp": datetime.now().isoformat()
            }), 200, headers
        else:
            return json.dumps({
                "error": f"Nitter returned {response.status_code}",
                "solution": "Check if Nitter instance is accessible"
            }), 500, headers

    except Exception as e:
        print(f"❌ Error: {e}")
        return json.dumps({
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500, headers

def parse_nitter_bookmarks(html):
    """Parse bookmarks from Nitter HTML"""
    bookmarks = []

    # Parse tweet links from Nitter HTML
    import re
    tweet_pattern = r'<a class="tweet-link"[^>]*href="/([^"]+)/status/(\d+)"[^>]*>([^<]*)</a>'

    matches = re.findall(tweet_pattern, html)

    for username, tweet_id, text in matches[:100]:  # Limit to 100
        bookmarks.append({
            "id": tweet_id,
            "url": f"https://twitter.com/{username}/status/{tweet_id}",
            "text": re.sub(r'<[^>]+>', '', text).strip(),
            "timestamp": datetime.now().isoformat()
        })

    return bookmarks

def upload_to_gcs(filename, data):
    """Upload data to GCS"""
    if not GCS_AVAILABLE:
        print("GCS not available, skipping upload")
        return

    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(filename)

        # Upload as JSON
        blob.upload_from_string(
            json.dumps(data, indent=2),
            content_type='application/json'
        )

        # Make public (so VM can read it)
        blob.make_public()

        print(f"✅ Uploaded to GCS: {filename}")

    except Exception as e:
        print(f"❌ GCS upload failed: {e}")

def fetch_instagram_bookmarks(request):
    """
    Placeholder for Instagram
    Instagram doesn't have an official API for saved posts
    """
    headers = {'Access-Control-Allow-Origin': '*',
               'Content-Type': 'application/json'}

    return json.dumps({
        "success": False,
        "error": "Instagram integration requires additional setup",
        "recommendation": "Use Apify ($5/month) or manual export",
        "note": "Twitter works perfectly via Nitter!"
    }), 200, headers
