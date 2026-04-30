#!/usr/bin/env node
/**
 * Sync Reddit Saved Posts to OmniClaw Vault
 * 
 * Requires Reddit OAuth credentials:
 * 1. Go to https://www.reddit.com/prefs/apps
 * 2. Create a "script" type app
 * 3. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env
 * 
 * Usage:
 *   node sync_reddit_saved.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadToVault, info, success, warn, error } = require('./vault_sync_lib');

const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const OUTPUT_FILE = path.join(__dirname, 'reddit_saved.json');

/**
 * Get Reddit access token
 */
async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET required');
  }

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials&duration=permanent'
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch user's saved posts
 */
async function getSavedPosts(accessToken) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'User-Agent': 'OmniClaw/1.0 (Personal Knowledge Graph)'
  };

  // Get user info first to get username
  const userResp = await fetch('https://oauth.reddit.com/api/v1/me', { headers });
  const user = await userResp.json();
  
  info(`Fetching saved posts for u/${user.name}...`);

  // Get saved items
  const savedResp = await fetch(
    `https://oauth.reddit.com/user/${user.name}/saved?limit=100`,
    { headers }
  );
  
  if (!savedResp.ok) {
    throw new Error(`Failed to fetch saved: ${savedResp.status}`);
  }

  const data = await savedResp.json();
  return data.data.children.map(post => transformPost(post.data));
}

/**
 * Transform Reddit post to vault format
 */
function transformPost(post) {
  return {
    id: post.id,
    vlSubject: post.title?.substring(0, 100) || 'Reddit Post',
    caption: post.selftext || post.url,
    url: post.url || `https://reddit.com${post.permalink}`,
    vlTags: extractTags(post),
    synced_at: new Date().toISOString(),
    source: 'reddit_saved',
    postType: post.is_self ? 'text' : 'link',
    subreddit: post.subreddit,
    score: post.score,
    numComments: post.num_comments,
    permalink: post.permalink ? `https://reddit.com${post.permalink}` : null,
    vlMood: getMood(post),
    vlStyle: getStyle(post)
  };
}

/**
 * Extract tags from Reddit post
 */
function extractTags(post) {
  const tags = [];
  
  // From subreddit
  tags.push(post.subreddit?.toLowerCase());
  
  // From title/caption
  if (post.title) {
    // Extract hashtags-like patterns
    const hashtags = post.title.match(/#\w+/g) || [];
    tags.push(...hashtags.map(h => h.substring(1).toLowerCase()));
  }
  
  // From flair
  if (post.link_flair_text) {
    tags.push(post.link_flair_text.toLowerCase());
  }
  
  // Limit to 10 tags
  return [...new Set(tags)].slice(0, 10);
}

/**
 * Determine post mood
 */
function getMood(post) {
  if (post.score > 5000) return 'viral';
  if (post.link_flair_text?.toLowerCase().includes('discussion')) return 'thoughtful';
  if (post.link_flair_text?.toLowerCase().includes('question')) return 'curious';
  if (post.is_self && post.selftext?.length > 500) return 'informative';
  return 'engaging';
}

/**
 * Determine post style
 */
function getStyle(post) {
  if (post.is_self) return 'text_post';
  if (post.post_hint === 'image') return 'image';
  if (post.post_hint === 'video') return 'video';
  if (post.domain?.includes('youtube.com')) return 'video';
  return 'link';
}

/**
 * Main sync function
 */
async function sync() {
  try {
    info('Starting Reddit saved posts sync...');
    
    const token = await getAccessToken();
    const posts = await getSavedPosts(token);
    
    info(`Found ${posts.length} saved posts`);
    
    const data = { posts, metadata: { synced_at: new Date().toISOString(), source: 'reddit' } };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    success(`Saved ${posts.length} posts to ${OUTPUT_FILE}`);
    
    await uploadToVault(OUTPUT_FILE, 'reddit_saved.json');
    
    return posts.length;
  } catch (err) {
    error(`Sync failed: ${err.message}`);
    error('Make sure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are set in .env');
    
    // Create empty file with message
    const placeholder = {
      posts: [],
      metadata: {
        synced_at: new Date().toISOString(),
        source: 'reddit',
        error: 'API credentials not configured',
        setup_url: 'https://www.reddit.com/prefs/apps'
      }
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(placeholder, null, 2));
    
    return 0;
  }
}

// Run if called directly
if (require.main === module) {
  sync().then(count => {
    console.log(`\nSynced ${count} Reddit saved posts`);
    process.exit(count > 0 ? 0 : 1);
  });
}

module.exports = { sync };
