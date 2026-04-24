/**
 * OmniClaw WhatsApp QR Cloud Service - Simplified
 * Uses local file auth with GCS backup for maximum reliability
 */

const express = require('express');
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(express.json());

// Configuration
const AUTH_DIR = path.join(__dirname, 'whatsapp_auth');
const PORT = parseInt(process.env.PORT || '8080');
const GCS_BUCKET = 'omniclaw-knowledge-graph';
const GCS_AUTH_PREFIX = 'whatsapp_auth/';

// Global state
let sock = null;
let authState = null;
let saveCreds = null;
let latestQR = null;
let qrGeneratedAt = null;
let connectionRetryCount = 0;

// GCS Storage client
const storage = new Storage({ projectId: 'omniclaw-personal-assistant' });
const bucket = storage.bucket(GCS_BUCKET);

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Simple GCS backup functions
 */
async function backupToGCS() {
  try {
    const files = fs.readdirSync(AUTH_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const localPath = path.join(AUTH_DIR, file);
        const gcsPath = GCS_AUTH_PREFIX + file;
        await bucket.upload(localPath, { destination: gcsPath });
        console.log('[GCS Backup] ✅ Backed up:', file);
      }
    }
  } catch (error) {
    console.error('[GCS Backup] ⚠️ Backup failed:', error.message);
  }
}

async function restoreFromGCS() {
  try {
    const [files] = await bucket.getFiles({ prefix: GCS_AUTH_PREFIX });
    if (files.length === 0) {
      console.log('[GCS Restore] ℹ️ No existing backups found');
      return false;
    }

    for (const file of files) {
      const fileName = file.name.replace(GCS_AUTH_PREFIX, '');
      const localPath = path.join(AUTH_DIR, fileName);
      await file.download({ destination: localPath });
      console.log('[GCS Restore] ✅ Restored:', fileName);
    }
    return true;
  } catch (error) {
    console.error('[GCS Restore] ⚠️ Restore failed:', error.message);
    return false;
  }
}

/**
 * Initialize WhatsApp connection - SIMPLIFIED VERSION
 */
async function initWhatsApp() {
  try {
    console.log('[WhatsApp] 🔵 Starting WhatsApp connection (simplified version)...');

    // Try to restore from GCS first
    const restored = await restoreFromGCS();
    if (restored) {
      console.log('[WhatsApp] ✅ Restored existing session from GCS');
    } else {
      console.log('[WhatsApp] 🆕 Fresh start - no existing session found');
    }

    // Use standard local file auth state (what Baileys was designed for)
    const authResult = await useMultiFileAuthState(AUTH_DIR);

    console.log('[WhatsApp] ✅ Auth state loaded, creds:', !!authResult.state.creds);

    // Enhance saveCreds to also backup to GCS
    const originalSaveCreds = authResult.saveCreds;
    const enhancedSaveCreds = async () => {
      await originalSaveCreds();
      await backupToGCS(); // Backup to GCS after saving locally
    };

    sock = makeWASocket({
      auth: authResult.state,
      printQRInTerminal: false,
    });

    authState = authResult.state;
    saveCreds = enhancedSaveCreds;

    // Set up connection listeners
    sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
      if (qr) {
        latestQR = qr;
        qrGeneratedAt = Date.now();
        console.log('[WhatsApp] ✅ QR Code received - scan quickly! (60s expiry)');

        // Save QR as PNG for dashboard
        try {
          const pngBuffer = qrcode.toBufferSync(qr, { type: 'png', width: 400, margin: 2 });
          const qrPath = path.join(AUTH_DIR, 'qrcode.png');
          fs.writeFileSync(qrPath, pngBuffer);
          console.log('[WhatsApp] ✅ QR PNG saved for dashboard');
        } catch (e) {
          console.error('[WhatsApp] ⚠️ QR PNG save failed:', e.message);
        }
      }

      if (connection === 'open') {
        console.log('[WhatsApp] ✅ CONNECTED - Session backed up to GCS');
        console.log('[WhatsApp] 👤 User:', sock.user.id, sock.user.name);
        latestQR = null;
        qrGeneratedAt = null;
        connectionRetryCount = 0;
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.error('[WhatsApp] ❌ Disconnected - statusCode:', statusCode);

        if (statusCode !== DisconnectReason.loggedOut) {
          const retryDelay = Math.min(30000, 5000 * Math.pow(2, connectionRetryCount));
          console.log(`[WhatsApp] 🔄 Reconnecting in ${retryDelay/1000}s... (attempt ${connectionRetryCount + 1})`);
          setTimeout(() => {
            connectionRetryCount++;
            initWhatsApp();
          }, retryDelay);
        } else {
          console.error('[WhatsApp] 🚪 Logged out - manual re-authentication required');
        }
      }
    });

    sock.ev.on('creds.update', () => {
      if (saveCreds) saveCreds();
    });

    return sock;
  } catch (error) {
    console.error('[WhatsApp] ❌ Init error:', error.message);
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'omniclaw-whatsapp-qr-cloud',
    status: 'healthy',
    connected: !!sock?.user,
    timestamp: new Date().toISOString()
  });
});

// Get connection status
app.get('/whatsapp/status', (req, res) => {
  res.json({
    connected: !!sock?.user,
    phone: sock?.user?.id || null,
    name: sock?.user?.name || null,
    hasQR: !!latestQR,
    retryCount: connectionRetryCount
  });
});

// Get QR code as base64 PNG image
app.get('/whatsapp/qr-image', async (req, res) => {
  try {
    if (sock?.user) {
      return res.json({ connected: true, message: 'Already connected' });
    }

    if (!latestQR) {
      return res.json({
        status: 'waiting',
        message: 'No QR available. Call POST /whatsapp/connect first.'
      });
    }

    const pngBuffer = await qrcode.toBuffer(latestQR, { type: 'png', width: 400, margin: 2 });
    const base64 = pngBuffer.toString('base64');
    res.json({
      qr: `data:image/png;base64,${base64}`,
      raw: latestQR,
      expiresAt: qrGeneratedAt ? qrGeneratedAt + 60000 : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connect/reconnect WhatsApp
app.post('/whatsapp/connect', async (req, res) => {
  try {
    console.log('[Connect] 🔵 Starting connection process...');
    connectionRetryCount = 0;

    initWhatsApp().catch(e => console.error('[Connect] ❌ Error:', e.message));

    // Wait for QR generation (up to 30 seconds)
    const maxWait = 30000;
    const checkInterval = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (latestQR) {
        console.log('[Connect] ✅ QR generated successfully');
        return res.json({
          success: true,
          hasQR: true,
          message: 'QR code ready - scan with WhatsApp',
          hint: 'QR expires in 60 seconds'
        });
      }

      if (sock?.user) {
        console.log('[Connect] ✅ Already connected via existing session');
        return res.json({
          success: true,
          connected: true,
          message: 'Already connected using existing session'
        });
      }

      await new Promise(r => setTimeout(r, checkInterval));
    }

    console.log('[Connect] ⚠️ Timeout - no QR generated');
    res.json({
      success: false,
      message: 'Connection timeout - QR not generated',
      hint: 'Check logs for errors, WhatsApp may be blocking Cloud Run IPs'
    });

  } catch (error) {
    console.error('[Connect] ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard HTML (same as before)
app.get('/whatsapp/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>OmniClaw WhatsApp Control</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d4ff; }
    .status { padding: 15px; background: #16213e; border-radius: 8px; margin: 20px 0; }
    .connected { border-left: 4px solid #00ff88; }
    .disconnected { border-left: 4px solid #ff4444; }
    button { width: 100%; padding: 12px; margin: 8px 0; border-radius: 5px; border: none; background: #00d4ff; color: #000; font-weight: bold; cursor: pointer; }
    button:hover { background: #00a8cc; }
    button:disabled { background: #666; cursor: not-allowed; }
    #qrSection { text-align: center; display: none; }
    #qrImage { max-width: 300px; border: 4px solid #00d4ff; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>🚀 OmniClaw WhatsApp Control</h1>

  <div id="status" class="status disconnected">
    <strong>Status:</strong> Checking...
  </div>

  <div id="qrSection">
    <h2>📱 Scan QR Code</h2>
    <p style="color:#ffaa00;">⏰ QR expires in 60 seconds — scan quickly!</p>
    <img id="qrImage" src="" alt="QR Code" />
    <br><br>
    <button onclick="refreshQR()">🔄 Refresh QR</button>
  </div>

  <button id="connectBtn" onclick="connect()">📲 Connect WhatsApp</button>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/whatsapp/status');
        const data = await res.json();
        const statusEl = document.getElementById('status');
        const connectBtn = document.getElementById('connectBtn');
        const qrSection = document.getElementById('qrSection');

        if (data.connected) {
          statusEl.className = 'status connected';
          statusEl.innerHTML = '<strong>✅ Connected</strong> - ' + (data.phone || data.name || 'WhatsApp');
          connectBtn.style.display = 'none';
          qrSection.style.display = 'none';
        } else {
          statusEl.className = 'status disconnected';
          statusEl.innerHTML = '<strong>❌ Not Connected</strong> - Click Connect to scan QR';
          connectBtn.style.display = 'block';
        }
      } catch (e) { console.error(e); }
    }

    async function connect() {
      const btn = document.getElementById('connectBtn');
      btn.disabled = true;
      btn.textContent = '🔄 Connecting...';

      try {
        const res = await fetch('/whatsapp/connect', { method: 'POST' });
        const data = await res.json();

        if (data.hasQR) {
          pollQR();
        } else if (data.connected) {
          updateStatus();
        } else {
          alert('⚠️ ' + (data.message || 'Connection failed'));
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }

      btn.disabled = false;
      btn.textContent = '📲 Connect WhatsApp';
    }

    async function pollQR() {
      const qrImage = document.getElementById('qrImage');
      const qrSection = document.getElementById('qrSection');
      const connectBtn = document.getElementById('connectBtn');
      const statusEl = document.getElementById('status');

      qrSection.style.display = 'block';
      connectBtn.style.display = 'none';
      statusEl.innerHTML = '<strong>📱 Scan the QR code below</strong>';

      const interval = setInterval(async () => {
        try {
          const res = await fetch('/whatsapp/qr-image');
          const data = await res.json();

          if (data.qr && data.qr.startsWith('data:image')) {
            qrImage.src = data.qr;
            clearInterval(interval);
            startStatusPolling();
          } else if (data.connected) {
            clearInterval(interval);
            updateStatus();
          }
        } catch (e) { console.error(e); }
      }, 2000);

      function startStatusPolling() {
        const statusInterval = setInterval(async () => {
          try {
            const res = await fetch('/whatsapp/status');
            const data = await res.json();
            if (data.connected) {
              clearInterval(statusInterval);
              clearInterval(interval);
              updateStatus();
            }
          } catch (e) {}
        }, 1500);
      }
    }

    async function refreshQR() {
      await connect();
    }

    updateStatus();
    setInterval(updateStatus, 10000);
  </script>
</body>
</html>
  `);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 OmniClaw WhatsApp QR Cloud Service (Simplified)');
  console.log('📡 Dashboard: http://localhost:' + PORT + '/whatsapp/dashboard');
  console.log('🔍 Health: http://localhost:' + PORT + '/health');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Auto-connect on startup
  initWhatsApp().catch(e => console.error('[Startup] ❌ Error:', e.message));
});

module.exports = app;