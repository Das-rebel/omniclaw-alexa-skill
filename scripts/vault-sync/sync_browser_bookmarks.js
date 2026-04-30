#!/usr/bin/env node
/**
 * Sync Browser Bookmarks to OmniClaw Vault
 * 
 * Currently supports:
 * - Chromium-based browsers (Chrome, Edge, Brave, Arc, etc.)
 * - Bookmarks are stored in ~/Library/Application Support/{Browser}/Default/
 * 
 * This extracts bookmarked URLs and transforms them into vault format.
 * 
 * Usage:
 *   node sync_browser_bookmarks.js [--browser chrome|edge|arc|brave]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { uploadToVault, info, success, warn, error } = require('./vault_sync_lib');

const OUTPUT_FILE = path.join(__dirname, 'browser_bookmarks.json');
const BROWSER = process.argv.includes('--browser') 
  ? process.argv[process.argv.indexOf('--browser') + 1] 
  : 'chromium';

/**
 * Chromium bookmark paths
 */
const BROWSER_PATHS = {
  chrome: path.join(process.env.HOME || '/Users/Subho', 'Library/Application Support/Google/Chrome/Default'),
  edge: path.join(process.env.HOME || '/Users/Subho', 'Library/Application Support/Microsoft Edge/Default'),
  arc: path.join(process.env.HOME || '/Users/Subho', 'Library/Application Support/Arc/Default'),
  brave: path.join(process.env.HOME || '/Users/Subho', 'Library/Application Support/BraveSoftware/Brave-Browser/Default'),
  chromium: path.join(process.env.HOME || '/Users/Subho', 'Library/Application Support/Chromium/Default')
};

/**
 * Get SQLite path for browser
 */
function getBookmarksPath(browser) {
  const basePath = BROWSER_PATHS[browser] || BROWSER_PATHS.chromium;
  return path.join(basePath, 'Bookmarks');
}

/**
 * Check if browser is available
 */
function isBrowserAvailable(browser) {
  return fs.existsSync(getBookmarksPath(browser));
}

/**
 * Parse Chrome's Bookmark file (JSON format)
 */
function parseChromeBookmarks(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Bookmarks file not found: ${filePath}`);
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const bookmarks = [];
  
  function traverse(node, path = '') {
    if (node.type === 'url') {
      bookmarks.push({
        id: node.id || generateId(),
        vlSubject: node.name || extractDomain(node.url),
        caption: node.url,
        url: node.url,
        vlTags: extractTagsFromUrl(node.url, path),
        synced_at: new Date().toISOString(),
        source: `browser_${BROWSER}`,
        folder: path || 'unsorted',
        dateAdded: node.date_added ? parseChromeDate(node.date_added) : null,
        vlMood: inferMood(node.url),
        vlStyle: inferStyle(node.url)
      });
    } else if (node.children) {
      const folderPath = path ? `${path}/${node.name}` : node.name;
      node.children.forEach(child => traverse(child, folderPath));
    }
  }
  
  // Traverse roots
  if (data.roots) {
    Object.values(data.roots).forEach(root => traverse(root));
  }
  
  return bookmarks;
}

/**
 * Generate simple ID
 */
function generateId() {
  return 'bm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Parse Chrome's microsecond timestamp
 */
function parseChromeDate(chromeDate) {
  // Chrome uses microseconds since 1601-01-01
  // Convert to Unix milliseconds
  const MICRO_TO_MILLI = 1000;
  const CHROME_EPOCH = 11644473600000; // milliseconds between 1601 and 1970
  return new Date(parseInt(chromeDate) / MICRO_TO_MILLI - CHROME_EPOCH).toISOString();
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url.substring(0, 50);
  }
}

/**
 * Extract tags from URL and folder path
 */
function extractTagsFromUrl(url, folder) {
  const tags = [];
  
  // From folder path
  if (folder) {
    folder.split('/').forEach(part => {
      if (part && part !== 'Other Bookmarks' && part !== 'Bookmarks Bar') {
        tags.push(part.toLowerCase().replace(/\s+/g, '_'));
      }
    });
  }
  
  // From URL domain
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      tags.push(parts[parts.length - 2].toLowerCase());
    }
  } catch {}
  
  // From URL path
  const keywords = ['tutorial', 'guide', 'docs', 'api', 'blog', 'news', 'article'];
  const urlLower = url.toLowerCase();
  keywords.forEach(kw => {
    if (urlLower.includes(kw)) tags.push(kw);
  });
  
  return [...new Set(tags)].slice(0, 8);
}

/**
 * Infer mood from URL
 */
function inferMood(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('news') || urlLower.includes('article')) return 'informative';
  if (urlLower.includes('github') || urlLower.includes('stackoverflow')) return 'technical';
  if (urlLower.includes('product') || urlLower.includes('shop')) return 'commercial';
  if (urlLower.includes('recipe') || urlLower.includes('food')) return 'appetizing';
  return 'engaging';
}

/**
 * Infer style from URL
 */
function inferStyle(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('github.com')) return 'code';
  if (urlLower.includes('youtube.com')) return 'video';
  if (urlLower.includes('medium.com') || urlLower.includes('dev.to')) return 'article';
  if (urlLower.includes('stackoverflow.com')) return 'q_and_a';
  return 'link';
}

/**
 * Main sync function
 */
async function sync(browser = BROWSER) {
  try {
    info(`Starting browser bookmarks sync for ${browser}...`);
    
    const bookmarksPath = getBookmarksPath(browser);
    
    if (!fs.existsSync(bookmarksPath)) {
      warn(`Bookmarks not found for ${browser}`);
      
      // List available browsers
      const available = Object.entries(BROWSER_PATHS)
        .filter(([name]) => isBrowserAvailable(name))
        .map(([name]) => name);
      
      if (available.length > 0) {
        info(`Available browsers: ${available.join(', ')}`);
        info(`Use --browser to specify: node sync_browser_bookmarks.js --browser ${available[0]}`);
      } else {
        info('No Chromium-based browsers found');
        info('Supported: Chrome, Edge, Arc, Brave, Chromium');
      }
      
      // Create placeholder
      const placeholder = {
        posts: [],
        metadata: {
          synced_at: new Date().toISOString(),
          source: 'browser_bookmarks',
          error: `No bookmarks for ${browser}`,
          available_browsers: available
        }
      };
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(placeholder, null, 2));
      return 0;
    }
    
    const bookmarks = parseChromeBookmarks(bookmarksPath);
    info(`Found ${bookmarks.length} bookmarks`);
    
    const data = { posts: bookmarks, metadata: { synced_at: new Date().toISOString(), source: 'browser_bookmarks', browser } };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    success(`Saved ${bookmarks.length} bookmarks to ${OUTPUT_FILE}`);
    
    await uploadToVault(OUTPUT_FILE, 'browser_bookmarks.json');
    
    return bookmarks.length;
  } catch (err) {
    error(`Sync failed: ${err.message}`);
    return 0;
  }
}

// Run if called directly
if (require.main === module) {
  const browser = process.argv.includes('--browser') 
    ? process.argv[process.argv.indexOf('--browser') + 1] 
    : BROWSER;
  
  sync(browser).then(count => {
    console.log(`\nSynced ${count} browser bookmarks`);
    process.exit(count > 0 ? 0 : 1);
  });
}

module.exports = { sync };
