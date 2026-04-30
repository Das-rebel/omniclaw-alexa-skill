#!/usr/bin/env node
/**
 * OmniClaw Vault Sync - Master Script
 * 
 * Syncs all data sources to gs://omniclaw-knowledge-graph/vault/
 * 
 * Usage:
 *   node sync_vault.js              # Sync all configured sources
 *   node sync_vault.js --status     # Check vault status
 *   node sync_vault.js --list       # List available sync scripts
 *   node sync_vault.js reddit       # Sync specific source
 */

const fs = require('fs');
const path = require('path');
const { uploadToVault, getVaultStatus, info, success, warn, error } = require('./vault_sync_lib');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function banner(msg) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${msg}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Available sync scripts
const SYNC_SCRIPTS = {
  reddit: {
    name: 'Reddit Saved Posts',
    file: 'sync_reddit_saved.js',
    description: 'Sync saved Reddit posts via OAuth',
    requires: 'REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET'
  },
  youtube: {
    name: 'YouTube Watch History',
    file: 'sync_youtube_history.js',
    description: 'Sync watch history from Takeout or API',
    requires: 'YOUTUBE_TAKEOUT_DIR or YOUTUBE_API_KEY'
  },
  browser: {
    name: 'Browser Bookmarks',
    file: 'sync_browser_bookmarks.js',
    description: 'Sync Chromium browser bookmarks',
    requires: 'Chromium-based browser installed'
  },
  facebook: {
    name: 'Facebook Posts',
    file: 'sync_facebook_posts.js',
    description: 'Sync Facebook posts via Graph API or export',
    requires: 'FB_ACCESS_TOKEN or FB_EXPORT_PATH'
  },
  linkedin: {
    name: 'LinkedIn Content',
    file: 'sync_linkedin_content.js',
    description: 'Sync LinkedIn from data export',
    requires: 'LINKEDIN_EXPORT_PATH'
  }
};

/**
 * List available sync scripts
 */
function listScripts() {
  console.log(`\n${colors.bold}Available Vault Sync Scripts${colors.reset}\n`);
  
  console.log(`${colors.bold}Current Vault Sources (already synced):${colors.reset}`);
  console.log('  - instagram_saved_automated.json (30 posts)');
  console.log('  - instagram_scrape.json (full scrape)');
  console.log('  - twitter_bookmarks_automated.json');
  console.log('  - bookmarks_automated.json (4 items)');
  console.log('  - unified_knowledge_graph.json (5862 tweets + entities)');
  
  console.log(`\n${colors.bold}Available Sync Scripts:${colors.reset}\n`);
  
  Object.entries(SYNC_SCRIPTS).forEach(([key, script]) => {
    console.log(`  ${colors.cyan}${key}${colors.reset}:`);
    console.log(`    ${colors.bold}${script.name}${colors.reset}`);
    console.log(`    ${script.description}`);
    console.log(`    ${colors.yellow}Requires:${colors.reset} ${script.requires}`);
    console.log('');
  });
  
  console.log(`\n${colors.bold}Usage:${colors.reset}`);
  console.log('  node sync_vault.js                  # Sync all');
  console.log('  node sync_vault.js --status         # Check vault status');
  console.log('  node sync_vault.js --list           # List scripts');
  console.log('  node sync_vault.js reddit            # Sync specific source');
}

/**
 * Sync a specific script
 */
async function syncScript(scriptKey) {
  const script = SYNC_SCRIPTS[scriptKey];
  if (!script) {
    error(`Unknown script: ${scriptKey}`);
    listScripts();
    process.exit(1);
  }
  
  const scriptPath = path.join(__dirname, script.file);
  if (!fs.existsSync(scriptPath)) {
    error(`Script not found: ${script.file}`);
    process.exit(1);
  }
  
  info(`Running ${script.name}...`);
  
  // Dynamically require and run the sync function
  const mod = require(path.resolve(scriptPath));
  const count = await mod.sync();
  
  return count;
}

/**
 * Sync all available scripts
 */
async function syncAll() {
  banner('OmniClaw Vault Sync');
  
  const results = {};
  let totalSynced = 0;
  
  for (const [key, script] of Object.entries(SYNC_SCRIPTS)) {
    try {
      const count = await syncScript(key);
      results[key] = { success: true, count };
      totalSynced += count;
    } catch (err) {
      results[key] = { success: false, error: err.message };
      error(`${key} failed: ${err.message}`);
    }
  }
  
  // Print summary
  banner('Sync Summary');
  
  Object.entries(results).forEach(([key, result]) => {
    if (result.success) {
      log(colors.green, 'OK', `${SYNC_SCRIPTS[key].name}: ${result.count} items`);
    } else {
      log(colors.red, 'FAIL', `${SYNC_SCRIPTS[key].name}: ${result.error}`);
    }
  });
  
  console.log(`\n${colors.bold}Total: ${totalSynced} items synced${colors.reset}\n`);
  
  return totalSynced;
}

/**
 * Check vault status
 */
async function checkStatus() {
  banner('OmniClaw Vault Status');
  
  const files = await getVaultStatus();
  
  if (files.length === 0) {
    warn('Could not retrieve vault status');
    return;
  }
  
  console.log(`${colors.bold}Files in gs://omniclaw-knowledge-graph/vault/:${colors.reset}\n`);
  
  let totalItems = 0;
  files.forEach(file => {
    const sizeKB = (file.size / 1024).toFixed(1);
    console.log(`  ${colors.cyan}${file.name}${colors.reset}`);
    
    // Estimate item count from file
    let estimate = 'unknown';
    if (file.name.includes('instagram_saved')) estimate = '~30';
    else if (file.name.includes('instagram_scrape')) estimate = '~1000+';
    else if (file.name.includes('knowledge_graph')) estimate = '~6000+';
    else if (file.name.includes('bookmarks')) estimate = '~4';
    else if (file.name.includes('twitter')) estimate = '0';
    
    console.log(`    Size: ${sizeKB} KB | Est. items: ${estimate}`);
    console.log('');
  });
  
  console.log(`${colors.bold}Current Data Sources (in vault):${colors.reset}`);
  console.log('  1. Instagram Saved (automated) - 30 posts');
  console.log('  2. Instagram Scrape (full) - 1000+ posts');
  console.log('  3. Twitter Bookmarks - 0 (needs API)');
  console.log('  4. General Bookmarks - 4 items');
  console.log('  5. Unified Knowledge Graph - 5862 tweets + entities');
  
  console.log(`\n${colors.bold}Planned Data Sources:${colors.reset}`);
  console.log('  6. Reddit Saved - needs OAuth setup');
  console.log('  7. YouTube Watch History - needs Takeout export');
  console.log('  8. Browser Bookmarks - needs browser');
  console.log('  9. Facebook Posts - needs API/export');
  console.log('  10. LinkedIn Content - needs export');
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
OmniClaw Vault Sync

Sync your personal data to the OmniClaw knowledge graph vault.

Options:
  --status    Check current vault status
  --list      List available sync scripts
  reddit      Sync Reddit saved posts
  youtube     Sync YouTube watch history
  browser     Sync browser bookmarks
  facebook    Sync Facebook posts
  linkedin    Sync LinkedIn content

Examples:
  node sync_vault.js --status    # Check what's in the vault
  node sync_vault.js reddit      # Sync only Reddit
  node sync_vault.js             # Sync all configured sources
`);
    process.exit(0);
  }
  
  if (args.includes('--status')) {
    await checkStatus();
  } else if (args.includes('--list')) {
    listScripts();
  } else if (args.length === 0) {
    await syncAll();
  } else {
    // Sync specific script(s)
    for (const arg of args) {
      if (SYNC_SCRIPTS[arg]) {
        await syncScript(arg);
      } else if (arg.startsWith('-')) {
        // Skip flags
      } else {
        warn(`Unknown script: ${arg}`);
      }
    }
  }
}

main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
