/**
 * OmniClaw WhatsApp QR Cloud Service
 * Fixed version with GCS persistence and Static IP routing
 */

const express = require('express');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Configuration
const AUTH_DIR = path.join(__dirname, 'whatsapp_auth');
const PORT = parseInt(process.env.PORT || '8080');

const { createGCSAuthState, syncToGCS, syncFromGCS, hasExistingSession } = require('./gcs_auth_state');

// Global state
let sock = null;
let latestQR = null;
let qrGeneratedAt = null;
let connectionRetryCount = 0;

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Initialize WhatsApp
 */
async function initWhatsApp() {
  try {
    console.log('[WhatsApp] Starting connection process...');

    // 1. Check GCS for existing session
    const sessionExists = await hasExistingSession();
    if (sessionExists) {
      console.log('[WhatsApp] Existing session found in GCS, syncing...');
      await syncFromGCS(AUTH_DIR);
    } else {
      console.log('[WhatsApp] No session found, starting fresh');
    }

    // 2. Use MultiFileAuthState (Local synced with GCS)
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    // 3. Create Socket
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      // Use a more recent Chrome user agent to avoid being flagged
      browser: ["Ubuntu", "Chrome", "22.04.4"]
    });

    console.log('[WhatsApp] Socket created');

    // 4. Handle Events
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        latestQR = qr;
        qrGeneratedAt = Date.now();
        console.log('[WhatsApp] QR RECEIVED');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('[WhatsApp] Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        if (shouldReconnect) {
          connectionRetryCount++;
          const delay = Math.min(30000, 5000 * Math.pow(2, connectionRetryCount));
          setTimeout(initWhatsApp, delay);
        }
      } else if (connection === 'open') {
        console.log('[WhatsApp] CONNECTED');
        connectionRetryCount = 0;
        latestQR = null;
      }
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      console.log('[WhatsApp] Creds updated locally, syncing to GCS...');
      try {
        await syncToGCS(AUTH_DIR);
        console.log('[WhatsApp] Sync to GCS success');
      } catch (e) {
        console.error('[WhatsApp] Sync to GCS failed:', e.message);
      }
    });

  } catch (error) {
    console.error('[WhatsApp] Init error:', error);
  }
}

// Routes
app.get('/health', (req, res) => res.json({ status: 'healthy', connected: !!sock?.user }));

app.post('/whatsapp/connect', async (req, res) => {
  if (sock?.user) return res.json({ success: true, connected: true });
  if (!sock) initWhatsApp();
  
  // Wait for QR
  let attempts = 0;
  while (attempts < 15 && !latestQR) {
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }
  
  if (latestQR) {
    res.json({ success: true, hasQR: true, qr: latestQR });
  } else {
    res.json({ success: false, message: 'Timeout waiting for QR' });
  }
});

app.get('/whatsapp/qr-image', async (req, res) => {
  if (!latestQR) return res.status(404).json({ error: 'No QR available' });
  const pngBuffer = await qrcode.toBuffer(latestQR);
  res.type('png').send(pngBuffer);
});

app.get('/whatsapp/status', (req, res) => {
  res.json({
    connected: !!sock?.user,
    hasQR: !!latestQR,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initWhatsApp();
});
