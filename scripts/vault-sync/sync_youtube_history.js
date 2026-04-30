#!/usr/bin/env node
/**
 * Sync YouTube Watch History to OmniClaw Vault
 * 
 * This script parses YouTube Takeout data to extract watch history.
 * 
 * YouTube Takeout Format:
 * 1. Go to https://takeout.google.com
 * 2. Select "YouTube and YouTube Music"
 * 3. Select "history" > "watch"
 * 4. Download and extract to ~/YouTube/
 * 
 * Or use YouTube Data API with OAuth:
 * 1. Create project at console.cloud.google.com
 * 2. Enable YouTube Data API v3
 * 3. Set YOUTUBE_API_KEY or YOUTUBE_CLIENT_ID/SECRET in .env
 * 
 * Usage:
 *   node sync_youtube_history.js [--takeout path] [--api]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { uploadToVault, info, success, warn, error } = require('./vault_sync_lib');

const TAKEOUT_DIR = process.env.YOUTUBE_TAKEOUT_DIR || path.join(process.env.HOME || '/Users/Subho', 'YouTube');
const OUTPUT_FILE = path.join(__dirname, 'youtube_watch_history.json');
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const API_MODE = process.argv.includes('--api') || process.env.YOUTUBE_API_MODE === 'true';

/**
 * Parse YouTube Takeout HTML/Watch History
 */
async function parseTakeoutHistory(takeoutPath) {
  const watchHistoryFile = path.join(takeoutPath, 'watch-history.html');
  
  if (!fs.existsSync(watchHistoryFile)) {
    // Try alternate locations
    const altPaths = [
      path.join(takeoutPath, 'YouTube', 'watch-history.html'),
      path.join(takeoutPath, 'history', 'watch-history.html'),
    ];
    
    for (const alt of altPaths) {
      if (fs.existsSync(alt)) {
        return parseHTMLFile(alt);
      }
    }
    
    throw new Error(`Watch history not found at ${watchHistoryFile}`);
  }
  
  return parseHTMLFile(watchHistoryFile);
}

/**
 * Parse HTML watch history file
 */
function parseHTMLFile(filePath) {
  info(`Parsing ${filePath}...`);
  
  const html = fs.readFileSync(filePath, 'utf8');
  const videos = [];
  
  // Parse entries from HTML - YouTube exports as nested divs
  // Format: <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
  //   <a href="...">Video Title</a>
  //   <a href="...">Channel Name</a>
  //   <a href="...">View date</a>
  // </div>
  
  const cellRegex = /<div class="content-cell[^"]*">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  
  while ((match = cellRegex.exec(html)) !== null) {
    const cell = match[1];
    
    // Extract video link
    const videoLinkMatch = cell.match(/href="(https:\/\/www\.youtube\.com\/watch\?[^"]+)"/);
    const titleMatch = cell.match(/>([^<]+)<\/a>/);
    const dateMatch = cell.match(/(\d{1,2}\s+\w+\s+\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*\w*)/);
    
    if (videoLinkMatch && titleMatch) {
      const url = videoLinkMatch[1];
      const videoId = extractVideoId(url);
      
      if (videoId) {
        videos.push({
          id: videoId,
          vlSubject: titleMatch[1].trim(),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId: videoId,
          timestamp: dateMatch ? parseDate(dateMatch[1]) : null,
          vlTags: [],
          synced_at: new Date().toISOString(),
          source: 'youtube_watch_history'
        });
      }
    }
  }
  
  // Alternative parsing for different export format
  if (videos.length === 0) {
    // Try JSON format (newer takeout)
    try {
      const jsonPath = filePath.replace('.html', '.json');
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return data.map(item => ({
          id: item.titleUrl?.split('v=')[1] || item.title,
          vlSubject: item.title,
          url: item.titleUrl,
          videoId: extractVideoId(item.titleUrl || ''),
          timestamp: item.time || null,
          vlTags: item.title ? extractTagsFromTitle(item.title) : [],
          synced_at: new Date().toISOString(),
          source: 'youtube_watch_history'
        }));
      }
    } catch (e) {
      // JSON parse failed, continue with HTML parsing
    }
  }
  
  return videos;
}

/**
 * Extract video ID from URL
 */
function extractVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Parse date from YouTube format
 */
function parseDate(dateStr) {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
}

/**
 * Extract tags from video title
 */
function extractTagsFromTitle(title) {
  const tags = [];
  
  // Extract bracketed content [Tutorial], [Review], etc
  const brackets = title.match(/\[([^\]]+)\]/g) || [];
  tags.push(...brackets.map(b => b.replace(/[\[\]]/g, '').toLowerCase()));
  
  // Extract keywords
  const keywords = ['tutorial', 'review', 'how-to', 'explained', 'guide', 'tips', 'tricks', '2024', '2023'];
  keywords.forEach(kw => {
    if (title.toLowerCase().includes(kw)) tags.push(kw);
  });
  
  return [...new Set(tags)].slice(0, 5);
}

/**
 * Fetch video metadata from YouTube Data API
 */
async function enrichWithAPI(videos) {
  if (!YOUTUBE_API_KEY) {
    warn('YOUTUBE_API_KEY not set - using basic metadata only');
    return videos;
  }
  
  info(`Enriching ${videos.length} videos with YouTube API...`);
  
  const enriched = [];
  const batchSize = 50;
  
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const ids = batch.map(v => v.videoId).filter(Boolean).join(',');
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids}&key=${YOUTUBE_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        batch.forEach(video => {
          const apiData = data.items?.find(item => item.id === video.videoId);
          if (apiData) {
            video.channelTitle = apiData.snippet.channelTitle;
            video.categoryId = apiData.snippet.categoryId;
            video.tags = apiData.snippet.tags || [];
            video.description = apiData.snippet.description?.substring(0, 200);
            video.duration = apiData.contentDetails.duration;
            
            // Add VL-style tags
            video.vlTags = extractTagsFromTitle(video.vlSubject);
            if (video.channelTitle) video.vlTags.push(video.channelTitle.toLowerCase());
          }
          enriched.push(video);
        });
      }
    } catch (err) {
      warn(`Batch ${i} failed: ${err.message}`);
      enriched.push(...batch);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  return enriched;
}

/**
 * Main sync function
 */
async function sync() {
  try {
    info('Starting YouTube watch history sync...');
    
    let videos = [];
    
    if (API_MODE) {
      info('Using YouTube Data API mode');
      warn('API mode requires user OAuth - not implemented yet');
      videos = [];
    } else {
      // Takeout mode
      info(`Looking for takeout data at ${TAKEOUT_DIR}`);
      
      if (!fs.existsSync(TAKEOUT_DIR)) {
        warn(`Takeout directory not found: ${TAKEOUT_DIR}`);
        info('To set up YouTube Takeout:');
        info('  1. Go to https://takeout.google.com');
        info('  2. Select "YouTube and YouTube Music"');
        info('  3. Select "history" > "watch"');
        info('  4. Download and extract to ~/YouTube/');
        info(`  5. Or set YOUTUBE_TAKEOUT_DIR in .env`);
        
        // Create placeholder
        const placeholder = {
          posts: [],
          metadata: {
            synced_at: new Date().toISOString(),
            source: 'youtube_watch_history',
            error: 'Takeout directory not found',
            setup_url: 'https://takeout.google.com'
          }
        };
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(placeholder, null, 2));
        return 0;
      }
      
      videos = await parseTakeoutHistory(TAKEOUT_DIR);
    }
    
    info(`Found ${videos.length} videos in watch history`);
    
    // Enrich with API if available
    if (videos.length > 0 && YOUTUBE_API_KEY) {
      videos = await enrichWithAPI(videos);
    }
    
    const data = { posts: videos, metadata: { synced_at: new Date().toISOString(), source: 'youtube' } };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    success(`Saved ${videos.length} videos to ${OUTPUT_FILE}`);
    
    await uploadToVault(OUTPUT_FILE, 'youtube_watch_history.json');
    
    return videos.length;
  } catch (err) {
    error(`Sync failed: ${err.message}`);
    return 0;
  }
}

// Run if called directly
if (require.main === module) {
  sync().then(count => {
    console.log(`\nSynced ${count} YouTube videos`);
    process.exit(count > 0 ? 0 : 1);
  });
}

module.exports = { sync };
