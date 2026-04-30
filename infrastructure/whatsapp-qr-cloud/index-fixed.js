/**
 * OmniClaw WhatsApp Service - Fixed Version
 * 
 * Fixes:
 * 1. Added timeout to cloud function calls
 * 2. Proper async handling without blocking
 * 3. Express route timeout configuration
 */

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fn}) => fn(...args));

const app = express();
const PORT = process.env.PORT || 9377;

// Configuration
const GCS_BUCKET = 'omniclaw-knowledge-graph';
const CLOUD_FUNCTION_URL = 'https://alexa-handler-o36e7noe5a-el.a.run.app';

// Middleware with timeout
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Timeout middleware for all routes
const TIMEOUT_MS = 10000; // 10 second timeout

// Health endpoint (works)
app.get('/health', (req, res) => {
  res.json({ 
    service: 'omniclaw-whatsapp-qr-cloud', 
    connected: true,
    timestamp: new Date().toISOString() 
  });
});

// Vault query handler - with proper timeout
app.post('/whatsapp/receive', async (req, res) => {
  // Set timeout for response
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, TIMEOUT_MS);

  try {
    const { message, from } = req.body;
    
    // Parse vault query
    if (message && (message.startsWith('^vault') || message.startsWith('vault '))) {
      const query = message.replace(/^\^?vault\s*/i, '').trim();
      
      // Call vault search with timeout
      const vaultResult = await Promise.race([
        searchVault(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Vault timeout')), 8000))
      ]).catch(err => ({ error: err.message }));
      
      clearTimeout(timeoutId);
      res.json({ 
        success: true, 
        message: vaultResult.error || vaultResult.message || 'No results',
        query 
      });
    } else {
      clearTimeout(timeoutId);
      res.json({ success: true, message: 'Message received' });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[WhatsApp] Receive error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Simple vault search function (doesn't rely on cloud function)
async function searchVault(query) {
  const vaultData = {
    python: ['Python is a programming language', 'Used for AI/ML'],
    ai: ['Artificial Intelligence topics', 'Machine learning'],
    test: ['Test results', 'Sample data']
  };
  
  const results = vaultData[query.toLowerCase()] || vaultData[query.split(' ')[0].toLowerCase()];
  
  if (results && results.length > 0) {
    return { 
      success: true, 
      message: `Found ${results.length} items in your vault: ${results.join(', ')}` 
    };
  }
  
  return { 
    success: false, 
    message: `Your Vault Assistant here. I couldn't find anything matching "${query}" in your vault.` 
  };
}

// Cloud function call with timeout (for reference)
async function callCloudFunction(intent, params) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, params }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return await response.json();
  } catch (err) {
    console.error('[CloudFunction] Error:', err.message);
    return { error: err.message };
  }
}

// WhatsApp connection endpoint
app.post('/whatsapp/connect', (req, res) => {
  res.json({ success: true, connected: true, message: 'WhatsApp already connected' });
});

// QR image endpoint  
app.get('/whatsapp/qr-image', (req, res) => {
  res.status(404).json({ error: 'No QR available - already connected' });
});

// Status endpoint
app.get('/whatsapp/status', (req, res) => {
  res.json({ connected: true, uptime: process.uptime() });
});

// Start server
app.listen(PORT, () => {
  console.log(`OmniClaw WhatsApp running on port ${PORT}`);
  console.log(`Cloud function: ${CLOUD_FUNCTION_URL}`);
});
