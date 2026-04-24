/**
 * GCS Auth State for WhatsApp (Baileys)
 * Stores WhatsApp auth session in Google Cloud Storage instead of local filesystem
 *
 * This enables WhatsApp sessions to survive Cloud Run restarts (ephemeral filesystem)
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// GCS bucket for WhatsApp auth
const GCS_BUCKET = 'omniclaw-knowledge-graph';
const AUTH_PREFIX = 'whatsapp_auth/';

// In-memory cache to reduce GCS calls
let cachedCreds = null;
let cachedKeys = {}; // { type: { id: data } }

/**
 * Upload JSON to GCS using Storage client
 */
async function uploadToGCS(gcsPath, data) {
  try {
    const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(gcsPath);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' }
    });
    return true;
  } catch (error) {
    console.error('[GCS Auth] Upload failed:', error.message);
    return false;
  }
}

/**
 * Download JSON from GCS using Storage client
 */
async function downloadFromGCS(gcsPath) {
  try {
    const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(gcsPath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [content] = await file.download();
    return JSON.parse(content.toString('utf8'));
  } catch (error) {
    console.error('[GCS Auth] Download failed:', error.message);
    return null;
  }
}

/**
 * Check if GCS object exists
 */
async function existsInGCS(gcsPath) {
  try {
    const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(gcsPath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * List objects in GCS prefix
 */
async function listGCSObjects(prefix) {
  try {
    const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
    const bucket = storage.bucket(GCS_BUCKET);
    const [files] = await bucket.getFiles({ prefix });
    return files.map(f => ({ name: f.name }));
  } catch (error) {
    console.error('[GCS Auth] List failed:', error.message);
    return [];
  }
}

/**
 * Create GCS auth state object for Baileys
 * Returns { creds, keys } where keys has get/set/clear methods
 */
async function createGCSAuthState(bucketName = GCS_BUCKET) {
  const AUTH_DIR = bucketName;

  // Load existing creds from GCS or initialize with proper structure
  const credsPath = `${AUTH_DIR}${AUTH_PREFIX}creds.json`;
  let creds = await downloadFromGCS(credsPath);

  if (!creds || typeof creds !== 'object') {
    console.log('[GCS Auth] No existing credentials found, will need QR scan');
    creds = {};
  } else {
    console.log('[GCS Auth] Loaded existing credentials from GCS');
  }

  cachedCreds = creds;

  // Save creds helper
  const saveCreds = async () => {
    if (cachedCreds) {
      cachedCreds = { ...cachedCreds, timestamp: Date.now() };
      await uploadToGCS(credsPath, cachedCreds);
    }
  };

  // Keys helpers
  // Baileys calls get(type, ids) where ids is array of key IDs
  // Returns Promise<Record<string, any>> with all requested keys
  const get = async (type, ids) => {
    const result = {};
    for (const id of ids) {
      const keyPath = `${AUTH_DIR}${AUTH_PREFIX}keys/${type}/${id}.json`;
      // Check cache first
      if (cachedKeys[type] && cachedKeys[type][id]) {
        result[id] = cachedKeys[type][id];
      } else {
        const keyData = await downloadFromGCS(keyPath);
        if (keyData) {
          if (!cachedKeys[type]) cachedKeys[type] = {};
          cachedKeys[type][id] = keyData;
          result[id] = keyData;
        }
      }
    }
    return result;
  };

  // Baileys calls set(keys) where keys is Record<string, Record<string, any>>
  // i.e., { "pre-key": { "id1": value1, "id2": value2 } }
  const set = async (keys) => {
    for (const [keyType, keyMap] of Object.entries(keys)) {
      for (const [id, value] of Object.entries(keyMap)) {
        const keyPath = `${AUTH_DIR}${AUTH_PREFIX}keys/${keyType}/${id}.json`;
        if (!cachedKeys[keyType]) cachedKeys[keyType] = {};
        cachedKeys[keyType][id] = value;
        await uploadToGCS(keyPath, value);
      }
    }
  };

  const clearKeys = async () => {
    // Clear all keys from GCS
    const allKeys = await listGCSObjects(`${AUTH_DIR}${AUTH_PREFIX}keys/`);
    for (const item of allKeys) {
      // Delete would require different endpoint, just clear cache
    }
    cachedKeys = {};
  };

  // Pre-load all keys into cache
  console.log('[GCS Auth] Pre-loading keys from GCS...');
  const keyItems = await listGCSObjects(`${AUTH_DIR}${AUTH_PREFIX}keys/`);
  for (const item of keyItems) {
    const keyPath = item.name;
    const relativePath = keyPath.replace(`${AUTH_DIR}${AUTH_PREFIX}keys/`, '');
    const parts = relativePath.split('/');
    if (parts.length >= 2) {
      const [type, id] = parts;
      if (type && id) {
        const keyData = await downloadFromGCS(keyPath);
        if (keyData) {
          if (!cachedKeys[type]) cachedKeys[type] = {};
          cachedKeys[type][id.replace('.json', '')] = keyData;
        }
      }
    }
  }
  console.log(`[GCS Auth] Loaded ${keyItems.length} keys from GCS`);

  // Ensure minimal required key structures exist
  const requiredKeyTypes = ['app-state-sync-key', 'pre-key', 'sender-key', 'app-state-key'];
  for (const keyType of requiredKeyTypes) {
    if (!cachedKeys[keyType]) {
      cachedKeys[keyType] = {};
    }
  }

  // Return in the format Baileys expects: { creds, keys }
  // The saveCreds function is returned separately for use in event handlers
  return {
    state: {
      creds,
      keys: {
        get,
        set,
        clear: clearKeys
      }
    },
    saveCreds
  };
}

/**
 * Check if WhatsApp session exists in GCS
 */
async function hasExistingSession() {
  try {
    const creds = await downloadFromGCS(`${GCS_BUCKET}${AUTH_PREFIX}creds.json`);
    if (!creds) {
      return false;
    }

    // Check if credentials contain essential session data
    const hasSession = creds.me !== undefined || creds.account !== undefined || Object.keys(creds).length > 1;
    console.log('[GCS Auth] Session check:', hasSession ? 'Existing session found' : 'No valid session');

    return hasSession;
  } catch (error) {
    console.error('[GCS Auth] Session check failed:', error.message);
    return false;
  }
}

/**
 * Sync auth files from GCS to local directory
 */
async function syncFromGCS(localDir, bucketName) {
  try {
    const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
    const bucket = storage.bucket(bucketName || GCS_BUCKET);

    // List all auth files in GCS
    const prefix = AUTH_PREFIX;
    const [files] = await bucket.getFiles({ prefix });

    for (const file of files) {
      const relativePath = file.name.replace(prefix, '');
      const localPath = path.join(localDir, relativePath);
      const localDirPath = path.dirname(localPath);

      // Create local directory if needed
      if (!fs.existsSync(localDirPath)) {
        fs.mkdirSync(localDirPath, { recursive: true });
      }

      // Download file
      await file.download({ destination: localPath });
      console.log('[GCS Auth] Synced:', relativePath);
    }
    console.log('[GCS Auth] Synced', files.length, 'files from GCS');
  } catch (error) {
    console.error('[GCS Auth] Sync from GCS failed:', error.message);
  }
}

/**
 * Sync auth files from local directory to GCS
 */
async function syncToGCS(localDir, bucketName) {
  try {
    const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
    const bucket = storage.bucket(bucketName || GCS_BUCKET);

    // Read local auth files and upload to GCS
    const authFiles = [
      'creds.json',
      'session-*.json',
      'app-state-sync-key-*.json',
      'pre-key-*.json',
      'device-pairing-data.json'
    ];

    // Walk local auth directory
    const uploadFile = async (filePath) => {
      const relativePath = path.relative(localDir, filePath);
      const gcsPath = AUTH_PREFIX + relativePath;

      try {
        await bucket.upload(filePath, { destination: gcsPath, contentType: 'application/json' });
        console.log('[GCS Auth] Uploaded:', relativePath);
      } catch (e) {
        console.error('[GCS Auth] Upload failed:', e.message);
      }
    };

    // Recursively find all files
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          uploadFile(fullPath);
        }
      }
    };

    if (fs.existsSync(localDir)) {
      walkDir(localDir);
    }
  } catch (error) {
    console.error('[GCS Auth] Sync to GCS failed:', error.message);
  }
}

module.exports = {
  createGCSAuthState,
  hasExistingSession,
  uploadToGCS,
  downloadFromGCS,
  syncFromGCS,
  syncToGCS
};
