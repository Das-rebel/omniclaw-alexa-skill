/**
 * TELOS Loader - Loads identity files into context
 * Part of PAI Control Plane Overlay
 */

const fs = require('fs');
const path = require('path');

const TELOS_FILES = [
  'MISSION',
  'GOALS',
  'PROJECTS',
  'BELIEFS',
  'MODELS',
  'STRATEGIES',
  'NARRATIVES',
  'LEARNED',
  'CHALLENGES',
  'IDEAS'
];

/**
 * Load all TELOS files into a context object
 * @param {Object} options - Loader options
 * @param {string} options.basePath - Base path to telos directory
 * @param {boolean} options.includeUser - Include user TELOS overrides
 * @returns {Object} TELOS context
 */
function loadTeler(options = {}) {
  const {
    basePath = path.join(__dirname),
    includeUser = true
  } = options;

  const context = {
    _meta: {
      loaded_at: new Date().toISOString(),
      source: 'system'
    }
  };

  // Load system TELOS files
  for (const name of TELOS_FILES) {
    const filePath = path.join(basePath, `${name}.md`);
    try {
      if (fs.existsSync(filePath)) {
        context[name.toLowerCase()] = fs.readFileSync(filePath, 'utf-8');
      }
    } catch (err) {
      console.warn(`Failed to load TELOS/${name}:`, err.message);
    }
  }

  // Load user overrides if present
  if (includeUser) {
    const userPath = path.join(basePath, '..', 'user', 'telos');
    if (fs.existsSync(userPath)) {
      context._meta.source = 'user';
      for (const name of TELOS_FILES) {
        const filePath = path.join(userPath, `${name}.md`);
        try {
          if (fs.existsSync(filePath)) {
            context[name.toLowerCase()] = fs.readFileSync(filePath, 'utf-8');
          }
        } catch (err) {
          // User override doesn't exist, use system default
        }
      }
    }
  }

  return context;
}

/**
 * Get a specific TELOS value by name
 * @param {string} name - TELOS file name (e.g., 'GOALS', 'beliefs')
 * @param {Object} options - Loader options
 * @returns {string|null} TELOS content or null
 */
function getTelo(name, options = {}) {
  const context = loadTeler(options);
  return context[name.toLowerCase()] || null;
}

module.exports = {
  loadTeler,
  getTelo,
  TELOS_FILES
};
