# OmniClaw Vault Sync Scripts

Sync additional data sources to `gs://omniclaw-knowledge-graph/vault/`.

## Current Vault Contents

| File | Items | Source | Status |
|------|-------|--------|--------|
| `instagram_saved_automated.json` | 30 | Instatter browser | Synced |
| `instagram_scrape.json` | 1000+ | Instatter browser | Synced |
| `twitter_bookmarks_automated.json` | 0 | Twitter API | Needs API access |
| `bookmarks_automated.json` | 4 | General bookmarks | Synced |
| `unified_knowledge_graph.json` | 5862 | Twitter KG | Synced |
| `browser_bookmarks.json` | 16 | Brave browser | **NEW** |

## Available Sync Scripts

### 1. Browser Bookmarks (`sync_browser_bookmarks.js`)
**Works immediately** - syncs Chromium-based browser bookmarks.

```bash
# Sync Brave (default if found)
node sync_browser_bookmarks.js

# Sync specific browser
node sync_browser_bookmarks.js --browser chrome
node sync_browser_bookmarks.js --browser arc
```

Supported: `chrome`, `edge`, `arc`, `brave`, `chromium`

### 2. YouTube Watch History (`sync_youtube_history.js`)
Requires YouTube Takeout export.

```bash
# Set takeout directory
export YOUTUBE_TAKEOUT_DIR=~/YouTube

# Or use YouTube Data API (needs OAuth)
export YOUTUBE_API_KEY=your_api_key
node sync_youtube_history.js --api
```

**Setup YouTube Takeout:**
1. Go to https://takeout.google.com
2. Select "YouTube and YouTube Music"
3. Select "history" > "watch"
4. Download and extract to `~/YouTube/`

### 3. Reddit Saved Posts (`sync_reddit_saved.js`)
Requires Reddit OAuth credentials.

```bash
export REDDIT_CLIENT_ID=your_client_id
export REDDIT_CLIENT_SECRET=your_client_secret
node sync_reddit_saved.js
```

**Setup Reddit OAuth:**
1. Go to https://www.reddit.com/prefs/apps
2. Create a "script" type app
3. Note your `client_id` (above username) and `client_secret`

### 4. Facebook Posts (`sync_facebook_posts.js`)
Requires Facebook Graph API access or data export.

```bash
# Via API (needs Facebook Developer setup)
export FB_ACCESS_TOKEN=your_access_token
node sync_facebook_posts.js --api

# Via export
export FB_EXPORT_PATH=~/Facebook
node sync_facebook_posts.js --export
```

**Setup Facebook:**
1. Go to https://developers.facebook.com
2. Create app > Add "Facebook Login"
3. Get user access token via OAuth flow

### 5. LinkedIn Content (`sync_linkedin_content.js`)
Best via LinkedIn data export (limited API access).

```bash
export LINKEDIN_EXPORT_PATH=~/LinkedIn
node sync_linkedin_content.js --export
```

**Setup LinkedIn Export:**
1. Go to https://linkedin.com/mypreferences
2. Navigate to "Data privacy" > "Get a copy of your data"
3. Request "Posts" and "Messages" export
4. Extract to `~/LinkedIn/`

## Master Sync Script

Sync all configured sources:

```bash
# Check vault status
node sync_vault.js --status

# List available scripts
node sync_vault.js --list

# Sync all
node sync_vault.js

# Sync specific source
node sync_vault.js reddit
node sync_vault.js youtube
node sync_vault.js browser
```

## Data Format

All vault files use this structure:

```json
{
  "posts": [
    {
      "id": "unique-id",
      "vlSubject": "Subject/title of content",
      "caption": "Description or text",
      "url": "https://...",
      "vlTags": ["tag1", "tag2"],
      "synced_at": "2026-04-28T19:56:06.102Z",
      "source": "source_name",
      "vlMood": "informative|engaging|...",
      "vlStyle": "article|video|link|..."
    }
  ],
  "metadata": {
    "synced_at": "...",
    "source": "..."
  }
}
```

## Integration with VaultClient

The `vault_client.js` already supports searching vault posts:

```javascript
const VaultClient = require('./infrastructure/cloud-functions/deploy/clients/vault_client');

// Find posts matching a query
const results = vault.findKnowledge('AI');

// Get random insight from vault
const insight = vault.getRandomInsight();

// Get mood-based recommendations
const moodPosts = vault.getVaultByMood('curious but lazy');
```

## Cron Setup (Optional)

Add to `scripts/bookmark-cron.sh` for automated syncs:

```bash
# Add after existing sync commands
echo "Syncing browser bookmarks..."
node scripts/vault-sync/sync_browser_bookmarks.js --browser brave
```

## Troubleshooting

### dotenv not found
```bash
npm install dotenv
```

### gsutil not available
```bash
npm install -g gsutil
# or
pip install gsutil
```

### Browser not found
Supported: Chrome, Edge, Arc, Brave, Chromium
```bash
# Check which browsers are available
ls ~/Library/Application\ Support/
```
