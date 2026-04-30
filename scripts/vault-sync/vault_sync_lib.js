#!/usr/bin/env node
/**
 * OmniClaw Vault Data Source Sync Scripts
 * 
 * This directory contains scripts to sync various data sources to the vault.
 * 
 * Current vault sources in gs://omniclaw-knowledge-graph/vault/:
 * - instagram_saved_automated.json (30 posts) - Already synced via instatter
 * - instagram_scrape.json (full scrape) - Already synced
 * - twitter_bookmarks_automated.json - Empty (needs Twitter API access)
 * - bookmarks_automated.json (4 items) - Already synced
 * - unified_knowledge_graph.json (5862 tweets + entities) - Already synced
 * 
 * Planned sources (need OAuth/API):
 * - facebook_posts.json - Facebook Graph API
 * - reddit_saved.json - Reddit OAuth
 * - linkedin_content.json - LinkedIn API
 * - youtube_watch_history.json - YouTube Takeout or API
 * - browser_bookmarks.json - Chromium bookmarks
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, '..', '..');
const VAULT_GCS_PATH = 'gs://omniclaw-knowledge-graph/vault';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function info(msg) { log(colors.blue, 'INFO', msg); }
function success(msg) { log(colors.green, 'SUCCESS', msg); }
function warn(msg) { log(colors.yellow, 'WARN', msg); }
function error(msg) { log(colors.red, 'ERROR', msg); }

/**
 * Upload a local JSON file to GCS vault
 */
async function uploadToVault(localPath, gcsName) {
  return new Promise((resolve, reject) => {
    const gcsPath = `${VAULT_GCS_PATH}/${gcsName}`;
    
    if (!fs.existsSync(localPath)) {
      warn(`File not found: ${localPath} - skipping ${gcsName}`);
      resolve(false);
      return;
    }

    info(`Uploading ${localPath} to ${gcsPath}...`);
    
    const gsutil = spawn('gsutil', ['cp', '-r', localPath, gcsPath]);
    
    gsutil.on('close', (code) => {
      if (code === 0) {
        success(`Uploaded ${gcsName}`);
        resolve(true);
      } else {
        error(`Failed to upload ${gcsName} (exit code: ${code})`);
        resolve(false);
      }
    });
    
    gsutil.on('error', (err) => {
      error(`Spawn error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Download from GCS vault to local
 */
async function downloadFromVault(gcsName, localPath) {
  return new Promise((resolve, reject) => {
    const gcsPath = `${VAULT_GCS_PATH}/${gcsName}`;
    
    info(`Downloading ${gcsPath} to ${localPath}...`);
    
    const gsutil = spawn('gsutil', ['cp', gcsPath, localPath]);
    
    gsutil.on('close', (code) => {
      if (code === 0) {
        success(`Downloaded ${gcsName}`);
        resolve(true);
      } else {
        error(`Failed to download ${gcsName}`);
        resolve(false);
      }
    });
    
    gsutil.on('error', (err) => {
      error(`Spawn error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Get vault status from GCS
 */
async function getVaultStatus() {
  return new Promise((resolve) => {
    info('Checking vault status...');
    
    const gsutil = spawn('gsutil', ['ls', '-l', `${VAULT_GCS_PATH}/`]);
    let output = '';
    
    gsutil.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    gsutil.on('close', (code) => {
      if (code === 0) {
        console.log('\n' + output);
        
        // Parse file sizes
        const lines = output.split('\n').filter(l => l.includes('vault/'));
        const files = lines.map(line => {
          const match = line.match(/vault\/(.+)\s+(\d+)/);
          return match ? { name: match[1], size: parseInt(match[2]) } : null;
        }).filter(Boolean);
        
        resolve(files);
      } else {
        error('Failed to list vault');
        resolve([]);
      }
    });
  });
}

module.exports = {
  uploadToVault,
  downloadFromVault,
  getVaultStatus,
  colors,
  info,
  success,
  warn,
  error
};
