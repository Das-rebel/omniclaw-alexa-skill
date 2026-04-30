#!/usr/bin/env node
/**
 * Sync LinkedIn Content to OmniClaw Vault
 * 
 * LinkedIn has very limited API access for personal data.
 * Best approach: Data Export from LinkedIn settings.
 * 
 * Setup:
 * 1. Go to https://linkedin.com/mypreferences?li勢=me_profile_settings
 * 2. Navigate to "Data privacy" > "Get a copy of your data"
 * 3. Request "Posts" export
 * 4. Download and extract to ~/LinkedIn/
 * 
 * Alternative (if you have LinkedIn API access):
 * - Apply for Partner Program
 * - Or use browser automation with cookies
 * 
 * Usage:
 *   node sync_linkedin_content.js [--export path]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { uploadToVault, info, success, warn, error } = require('./vault_sync_lib');

const EXPORT_PATH = process.env.LINKEDIN_EXPORT_PATH || path.join(process.env.HOME || '/Users/Subho', 'LinkedIn');
const OUTPUT_FILE = path.join(__dirname, 'linkedin_content.json');

/**
 * Parse LinkedIn data export
 */
async function parseExport(exportPath) {
  info(`Parsing LinkedIn export at ${exportPath}...`);
  
  const posts = [];
  
  // LinkedIn exports to various formats
  // Look for messages.html, reactions.html, etc.
  const files = [
    'messages.html',
    'posts.html',
    'content.html',
    'Share.json'
  ];
  
  for (const file of files) {
    const filePath = path.join(exportPath, file);
    if (fs.existsSync(filePath)) {
      const parsed = await parseFile(filePath, file);
      if (parsed.length > 0) {
        posts.push(...parsed);
      }
    }
  }
  
  // Also check subdirectories
  if (fs.existsSync(exportPath)) {
    const subdirs = fs.readdirSync(exportPath);
    for (const subdir of subdirs) {
      const subPath = path.join(exportPath, subdir);
      if (fs.statSync(subPath).isDirectory()) {
        const sharePath = path.join(subPath, 'Share.json');
        if (fs.existsSync(sharePath)) {
          const parsed = await parseShareJson(sharePath);
          posts.push(...parsed);
        }
      }
    }
  }
  
  return posts;
}

/**
 * Parse HTML file from export
 */
async function parseFile(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const posts = [];
    
    if (fileName === 'Share.json') {
      return parseShareJson(filePath);
    }
    
    if (content.includes('messages.html') || content.includes('Messages')) {
      // Message-based content
      return parseMessagesHtml(content);
    }
    
    if (content.includes('profileUpdates')) {
      // Posts/Updates
      return parsePostsHtml(content);
    }
    
    return posts;
  } catch (err) {
    warn(`Failed to parse ${filePath}: ${err.message}`);
    return [];
  }
}

/**
 * Parse Share.json from LinkedIn export
 */
async function parseShareJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const posts = [];
    
    const items = Array.isArray(data) ? data : data.data || [];
    
    for (const item of items) {
      if (item.shareContent || item.text || item.content) {
        posts.push(transformPost(item));
      }
    }
    
    return posts;
  } catch (err) {
    // JSON parse may fail, try line by line
    try {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
      const posts = [];
      
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.shareContent || item.text) {
            posts.push(transformPost(item));
          }
        } catch {}
      }
      
      return posts;
    } catch {
      warn(`Could not parse ${filePath}`);
      return [];
    }
  }
}

/**
 * Parse messages HTML content
 */
function parseMessagesHtml(html) {
  const posts = [];
  
  // LinkedIn messages contain shared content
  // Extract message text and any shared links
  const messageRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  
  while ((match = messageRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text && text.length > 20) {
      posts.push({
        id: 'li_msg_' + hashCode(text),
        vlSubject: text.split('\n')[0].substring(0, 100),
        caption: text,
        url: '',
        vlTags: extractTags(text),
        synced_at: new Date().toISOString(),
        source: 'linkedin_messages',
        vlMood: 'informative',
        vlStyle: 'message'
      });
    }
  }
  
  return posts;
}

/**
 * Parse posts HTML content
 */
function parsePostsHtml(html) {
  const posts = [];
  
  // Extract post content
  const postRegex = /<article[^>]*>([\s\S]*?)<\/article>/g;
  let match;
  
  while ((match = postRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text && text.length > 20) {
      posts.push(transformPost({ text }));
    }
  }
  
  return posts;
}

/**
 * Simple hash function
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Transform LinkedIn post to vault format
 */
function transformPost(item) {
  const text = item.text || item.shareContent || item.content || '';
  
  return {
    id: item.shareUrn || item.id || 'li_' + Date.now().toString(36),
    vlSubject: extractSubject(text),
    caption: text,
    url: item.permalink || item.url || '',
    vlTags: extractTags(text),
    synced_at: new Date().toISOString(),
    source: 'linkedin',
    postType: item.type || inferType(item),
    reactions: item.reactions || 0,
    comments: item.comments || 0,
    createdAt: item.date || item.createdAt || item.timestamp,
    vlMood: inferMood(text),
    vlStyle: inferStyle(item)
  };
}

/**
 * Extract subject from text
 */
function extractSubject(text) {
  if (!text) return 'LinkedIn Post';
  
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= 100) return firstLine;
  return firstLine.substring(0, 97) + '...';
}

/**
 * Extract tags from text
 */
function extractTags(text) {
  const tags = [];
  
  // From hashtags
  const hashtags = text.match(/#\w+/g) || [];
  tags.push(...hashtags.map(h => h.substring(1).toLowerCase()));
  
  // Platform tag
  tags.push('linkedin');
  
  // Common LinkedIn topics
  const topics = ['tech', 'ai', 'machine-learning', 'startup', 'career', 'leadership', 'business'];
  const textLower = text.toLowerCase();
  topics.forEach(topic => {
    if (textLower.includes(topic)) tags.push(topic);
  });
  
  return [...new Set(tags)].slice(0, 10);
}

/**
 * Infer type from item
 */
function inferType(item) {
  if (item.type === 'VIDEO') return 'video';
  if (item.type === 'IMAGE') return 'photo';
  if (item.type === 'ARTICLE') return 'article';
  if (item.url || item.permalink) return 'link';
  return 'text';
}

/**
 * Infer mood
 */
function inferMood(text) {
  if (text.includes('excited') || text.includes('thrilled')) return 'excited';
  if (text.includes('thought') || text.includes('insight')) return 'thoughtful';
  if (text.includes('job') || text.includes('career')) return 'professional';
  if (text.includes('#')) return 'engaging';
  if (text.length > 500) return 'informative';
  return 'professional';
}

/**
 * Infer style
 */
function inferStyle(item) {
  if (item.type === 'VIDEO') return 'video';
  if (item.type === 'IMAGE') return 'photo';
  if (item.type === 'ARTICLE') return 'article';
  return 'post';
}

/**
 * Main sync function
 */
async function sync() {
  try {
    info('Starting LinkedIn content sync...');
    
    if (!fs.existsSync(EXPORT_PATH)) {
      warn(`LinkedIn export not found at ${EXPORT_PATH}`);
      info('');
      info('To set up LinkedIn export:');
      info('  1. Go to https://linkedin.com/mypreferences');
      info('  2. Navigate to "Data privacy" > "Get a copy of your data"');
      info('  3. Request "Messages" and "Posts" export');
      info('  4. Download and extract to ~/LinkedIn/');
      info('  5. Or set LINKEDIN_EXPORT_PATH in .env');
      info('');
      
      // Create placeholder
      const placeholder = {
        posts: [],
        metadata: {
          synced_at: new Date().toISOString(),
          source: 'linkedin',
          error: 'LinkedIn export not found',
          setup_url: 'https://linkedin.com/mypreferences'
        }
      };
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(placeholder, null, 2));
      return 0;
    }
    
    const posts = await parseExport(EXPORT_PATH);
    info(`Found ${posts.length} LinkedIn posts`);
    
    const data = { posts, metadata: { synced_at: new Date().toISOString(), source: 'linkedin' } };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    success(`Saved ${posts.length} posts to ${OUTPUT_FILE}`);
    
    await uploadToVault(OUTPUT_FILE, 'linkedin_content.json');
    
    return posts.length;
  } catch (err) {
    error(`Sync failed: ${err.message}`);
    return 0;
  }
}

// Run if called directly
if (require.main === module) {
  sync().then(count => {
    console.log(`\nSynced ${count} LinkedIn posts`);
    process.exit(count > 0 ? 0 : 1);
  });
}

module.exports = { sync };
