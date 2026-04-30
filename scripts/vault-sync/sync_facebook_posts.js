#!/usr/bin/env node
/**
 * Sync Facebook Posts to OmniClaw Vault
 * 
 * Uses Facebook Graph API to fetch user's posts.
 * Note: Facebook's API is restrictive for personal data access.
 * 
 * Setup:
 * 1. Create a Facebook App at https://developers.facebook.com
 * 2. Add "Facebook Login" product
 * 3. Set permissions: user_posts, public_profile
 * 4. Get User Access Token via OAuth flow
 * 5. Set FB_ACCESS_TOKEN in .env
 * 
 * Alternative (limited data):
 * - Export from Facebook > Settings > Your Facebook Information > Download Your Information
 * - Select "Posts" and download as JSON/HTML
 * 
 * Usage:
 *   node sync_facebook_posts.js [--export path] [--api]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { uploadToVault, info, success, warn, error } = require('./vault_sync_lib');

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_USER_ID = process.env.FB_USER_ID || 'me';
const EXPORT_PATH = process.env.FB_EXPORT_PATH;
const OUTPUT_FILE = path.join(__dirname, 'facebook_posts.json');

/**
 * Fetch posts via Facebook Graph API
 */
async function fetchFromAPI() {
  if (!FB_ACCESS_TOKEN) {
    throw new Error('FB_ACCESS_TOKEN required');
  }

  info('Fetching Facebook posts via Graph API...');

  // Fetch recent posts
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${FB_USER_ID}/posts?` +
    `fields=id,message,created_time,full_picture,permalink_url,type,shares,reactions,comments.summary(true),link` +
    `&limit=100&access_token=${FB_ACCESS_TOKEN}`
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.data.map(post => transformPost(post));
}

/**
 * Parse Facebook data export (HTML format)
 */
async function parseExport(htmlPath) {
  info(`Parsing Facebook export at ${htmlPath}...`);
  
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Export file not found: ${htmlPath}`);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const posts = [];

  // Parse posts from HTML export
  // Facebook exports posts in data arrays
  const postDataRegex = /data-store="([^"]+)"/g;
  let match;

  while ((match = postDataRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(decodeURIComponent(match[1]));
      if (data && data.attachments) {
        posts.push(...extractPostsFromAttachments(data.attachments));
      }
    } catch {}
  }

  // Alternative: parse JSON export
  const jsonPath = htmlPath.replace('.html', '.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(jsonData)) {
        return jsonData.map(post => transformExportPost(post));
      }
    } catch {}
  }

  return posts;
}

/**
 * Extract posts from attachments
 */
function extractPostsFromAttachments(attachments) {
  const posts = [];
  
  for (const attachment of attachments) {
    if (attachment.data && Array.isArray(attachment.data)) {
      for (const item of attachment.data) {
        if (item.text || item.title) {
          posts.push({
            id: item.uri || item.title,
            vlSubject: item.title?.substring(0, 100) || 'Facebook Post',
            caption: item.text || item.description,
            url: item.uri,
            vlTags: extractTags(item),
            synced_at: new Date().toISOString(),
            source: 'facebook_export'
          });
        }
      }
    }
  }
  
  return posts;
}

/**
 * Transform API post to vault format
 */
function transformPost(post) {
  return {
    id: post.id,
    vlSubject: extractSubject(post.message),
    caption: post.message || post.link || '',
    url: post.permalink_url || post.link || `https://facebook.com/${post.id}`,
    vlTags: extractTagsFromPost(post),
    synced_at: new Date().toISOString(),
    source: 'facebook_api',
    postType: post.type,
    likes: post.reactions?.summary?.total_count || 0,
    shares: post.shares?.count || 0,
    comments: post.comments?.summary?.total_count || 0,
    createdAt: post.created_time,
    vlMood: inferMood(post),
    vlStyle: inferStyle(post)
  };
}

/**
 * Transform export post to vault format
 */
function transformExportPost(post) {
  return {
    id: post.timestamp || post.id || Date.now().toString(),
    vlSubject: extractSubject(post.data?.find(d => d.type === 'text')?.text || post.title),
    caption: post.data?.find(d => d.type === 'text')?.text || post.title || '',
    url: post.url || post.permalink,
    vlTags: extractTagsFromPost(post),
    synced_at: new Date().toISOString(),
    source: 'facebook_export',
    createdAt: post.timestamp || post.date,
    vlMood: 'informative',
    vlStyle: inferStyle(post)
  };
}

/**
 * Extract subject from message
 */
function extractSubject(message) {
  if (!message) return 'Facebook Post';
  
  const firstLine = message.split('\n')[0].trim();
  if (firstLine.length <= 100) return firstLine;
  return firstLine.substring(0, 97) + '...';
}

/**
 * Extract tags from post
 */
function extractTagsFromPost(post) {
  const tags = [];
  
  const text = post.message || post.caption || '';
  
  // Extract hashtags
  const hashtags = text.match(/#\w+/g) || [];
  tags.push(...hashtags.map(h => h.substring(1).toLowerCase()));
  
  // Add platform tag
  tags.push('facebook');
  
  // Add type tag
  if (post.type === 'video') tags.push('video');
  else if (post.type === 'photo') tags.push('photo');
  else if (post.type === 'link') tags.push('link');
  
  return [...new Set(tags)].slice(0, 10);
}

/**
 * Infer mood from post
 */
function inferMood(post) {
  const message = post.message || '';
  
  if (message.includes('!') && message.length < 100) return 'excited';
  if (message.includes('?')) return 'curious';
  if (message.includes('#')) return 'engaging';
  if (message.length > 500) return 'informative';
  if (post.type === 'photo') return 'visual';
  
  return 'engaging';
}

/**
 * Infer style from post
 */
function inferStyle(post) {
  if (post.type === 'video') return 'video';
  if (post.type === 'photo') return 'photo';
  if (post.type === 'link') return 'link_share';
  return 'text_post';
}

/**
 * Main sync function
 */
async function sync() {
  try {
    info('Starting Facebook posts sync...');
    
    let posts = [];
    
    if (FB_ACCESS_TOKEN) {
      posts = await fetchFromAPI();
    } else if (EXPORT_PATH) {
      posts = await parseExport(EXPORT_PATH);
    } else {
      warn('No Facebook data source configured');
      info('');
      info('Option 1: API Access (requires Facebook Developer setup)');
      info('  1. Go to https://developers.facebook.com');
      info('  2. Create app > Add Facebook Login');
      info('  3. Set FB_ACCESS_TOKEN in .env');
      info('');
      info('Option 2: Data Export');
      info('  1. Facebook > Settings > Your Facebook Information');
      info('  2. Download Your Information > Select Posts');
      info('  3. Set FB_EXPORT_PATH in .env');
      info('');
      
      // Create placeholder
      const placeholder = {
        posts: [],
        metadata: {
          synced_at: new Date().toISOString(),
          source: 'facebook',
          error: 'No Facebook credentials configured',
          setup_url: 'https://developers.facebook.com'
        }
      };
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(placeholder, null, 2));
      return 0;
    }
    
    info(`Found ${posts.length} Facebook posts`);
    
    const data = { posts, metadata: { synced_at: new Date().toISOString(), source: 'facebook' } };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    success(`Saved ${posts.length} posts to ${OUTPUT_FILE}`);
    
    await uploadToVault(OUTPUT_FILE, 'facebook_posts.json');
    
    return posts.length;
  } catch (err) {
    error(`Sync failed: ${err.message}`);
    return 0;
  }
}

// Run if called directly
if (require.main === module) {
  sync().then(count => {
    console.log(`\nSynced ${count} Facebook posts`);
    process.exit(count > 0 ? 0 : 1);
  });
}

module.exports = { sync };
