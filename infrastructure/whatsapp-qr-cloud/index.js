/**
 * OmniClaw WhatsApp QR Cloud Service
 * Standalone service for WhatsApp authentication and messaging
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Configuration
const AUTH_DIR = path.join(__dirname, 'whatsapp_auth');
const PORT = process.env.PORT || 3000;

// Global state
let sock = null;
let authState = null;
let saveCreds = null;

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Initialize WhatsApp connection
 */
async function initWhatsApp() {
  try {
    const { state, saveCreds: sc } = await useMultiFileAuthState(AUTH_DIR);
    authState = state;
    saveCreds = sc;

    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      browser: ['OmniClaw WhatsApp Cloud', 'Chrome', '104.0.0.0'],
    });

    sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
      if (qr) {
        console.log('[WhatsApp] QR Code available at /whatsapp/qr');
      }
      if (connection === 'open') {
        console.log('[WhatsApp] Connected');
      }
      if (connection === 'close') {
        console.log('[WhatsApp] Disconnected, reason:', lastDisconnect?.error);
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          // Try to reconnect
          setTimeout(initWhatsApp, 5000);
        }
      }
    });

    sock.ev.on('creds.update', () => {
      if (saveCreds) saveCreds();
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 60000);
      const check = setInterval(() => {
        if (sock?.user) {
          clearTimeout(timeout);
          clearInterval(check);
          resolve();
        }
      }, 500);
    });

    return sock;
  } catch (error) {
    console.error('[WhatsApp] Init error:', error.message);
    throw error;
  }
}

/**
 * Convert phone number to WhatsApp JID
 */
function toJID(phone) {
  if (!phone) return null;
  if (phone.includes('@')) return phone;
  const num = phone.replace(/\D/g, '');
  return num.length > 15 ? `${num}@c.us` : `${num}@s.whatsapp.net`;
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'omniclaw-whatsapp-qr-cloud',
    connected: !!sock?.user,
    timestamp: new Date().toISOString()
  });
});

// Get QR code as image
app.get('/whatsapp/qr', async (req, res) => {
  try {
    if (sock?.user) {
      return res.json({ message: 'Already connected', connected: true });
    }

    // Get the QR from socket
    // QR is available during initial connection setup
    res.json({
      message: 'Scan QR at /whatsapp/qr-image endpoint',
      hint: 'Use /whatsapp/qr-image for base64 PNG'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get QR code as base64 PNG
app.get('/whatsapp/qr-image', async (req, res) => {
  try {
    if (sock?.user) {
      return res.json({ message: 'Already connected', connected: true });
    }

    // Trigger new QR by reconnecting
    if (!sock?.ws?.readyState) {
      await initWhatsApp();
    }

    // The QR should be in the connection update
    // For now, return waiting status
    res.json({
      status: 'checking',
      message: 'If not connected, please call /whatsapp/connect first'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connect/reconnect WhatsApp
app.post('/whatsapp/connect', async (req, res) => {
  try {
    await initWhatsApp();
    res.json({
      success: true,
      connected: !!sock?.user,
      phone: sock?.user?.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get connection status
app.get('/whatsapp/status', async (req, res) => {
  res.json({
    connected: !!sock?.user,
    phone: sock?.user?.id || null,
    name: sock?.user?.name || null,
    authDir: AUTH_DIR
  });
});

// Send message
app.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message, phone } = req.body;

    if (!sock?.user) {
      return res.status(503).json({ error: 'Not connected to WhatsApp' });
    }

    const jid = toJID(to || phone);
    if (!jid) {
      return res.status(400).json({ error: 'Missing recipient phone number' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Missing message text' });
    }

    const result = await sock.sendMessage(jid, { text: message });

    res.json({
      success: true,
      to: jid,
      messageId: result.key.id
    });
  } catch (error) {
    console.error('[WhatsApp] Send error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get contacts
app.get('/whatsapp/contacts', async (req, res) => {
  try {
    if (!sock?.user) {
      return res.status(503).json({ error: 'Not connected' });
    }

    const contacts = sock.store?.contacts || {};
    const contactList = Object.values(contacts).map(c => ({
      id: c.id,
      name: c.name || c.notify || c.verifiedName || 'Unknown',
      isBusiness: c.isBusiness
    }));

    res.json({ contacts: contactList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent chats
app.get('/whatsapp/chats', async (req, res) => {
  try {
    if (!sock?.user) {
      return res.status(503).json({ error: 'Not connected' });
    }

    const chats = Object.values(sock.store?.chats || {})
      .sort((a, b) => (b.lastMessage?.messageTimestamp || 0) - (a.lastMessage?.messageTimestamp || 0))
      .slice(0, 20)
      .map(c => ({
        jid: c.jid,
        name: c.name || c.jid,
        unread: c.unreadCount || 0,
        lastMessage: c.lastMessage?.message?.conversation || c.lastMessage?.message?.extendedTextMessage?.text || ''
      }));

    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard HTML
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
    input, textarea, button { width: 100%; padding: 12px; margin: 8px 0; border-radius: 5px; border: none; box-sizing: border-box; }
    input, textarea { background: #0f3460; color: #fff; }
    button { background: #00d4ff; color: #000; cursor: pointer; font-weight: bold; }
    button:hover { background: #00a8cc; }
    button:disabled { background: #666; cursor: not-allowed; }
    .result { padding: 10px; margin: 10px 0; border-radius: 5px; }
    .success { background: #0d3320; }
    .error { background: #3d0f0f; }
    .chat { padding: 10px; background: #16213e; margin: 5px 0; border-radius: 5px; cursor: pointer; }
    .chat:hover { background: #1a2a4a; }
  </style>
</head>
<body>
  <h1>OmniClaw WhatsApp Control</h1>

  <div id="status" class="status disconnected">
    <strong>Status:</strong> Checking...
  </div>

  <button id="connectBtn" onclick="connect()">Connect WhatsApp</button>

  <div id="sendSection" style="display:none;">
    <h2>Send Message</h2>
    <input type="text" id="to" placeholder="Phone number (91XXXXXXXXXX)">
    <textarea id="message" placeholder="Message text" rows="3"></textarea>
    <button onclick="sendMessage()">Send Message</button>
  </div>

  <div id="result"></div>

  <h2>Recent Chats</h2>
  <div id="chats"></div>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/whatsapp/status');
        const data = await res.json();
        const statusEl = document.getElementById('status');
        const connectBtn = document.getElementById('connectBtn');
        const sendSection = document.getElementById('sendSection');

        if (data.connected) {
          statusEl.className = 'status connected';
          statusEl.innerHTML = '<strong>Connected</strong> - ' + (data.phone || data.name || 'WhatsApp');
          connectBtn.style.display = 'none';
          sendSection.style.display = 'block';
          loadChats();
        } else {
          statusEl.className = 'status disconnected';
          statusEl.innerHTML = '<strong>Not Connected</strong> - Click Connect to scan QR';
          connectBtn.style.display = 'block';
          sendSection.style.display = 'none';
        }
      } catch (e) {
        console.error(e);
      }
    }

    async function connect() {
      const btn = document.getElementById('connectBtn');
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      try {
        const res = await fetch('/whatsapp/connect', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          updateStatus();
        } else {
          alert('Connection failed: ' + data.error);
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
      btn.disabled = false;
      btn.textContent = 'Connect WhatsApp';
    }

    async function sendMessage() {
      const to = document.getElementById('to').value;
      const message = document.getElementById('message').value;
      const resultEl = document.getElementById('result');

      if (!to || !message) {
        resultEl.className = 'result error';
        resultEl.textContent = 'Please fill in both phone and message';
        return;
      }

      resultEl.className = 'result';
      resultEl.textContent = 'Sending...';

      try {
        const res = await fetch('/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, message })
        });
        const data = await res.json();

        if (data.success) {
          resultEl.className = 'result success';
          resultEl.textContent = 'Message sent! ID: ' + data.messageId;
          document.getElementById('message').value = '';
        } else {
          resultEl.className = 'result error';
          resultEl.textContent = 'Error: ' + data.error;
        }
      } catch (e) {
        resultEl.className = 'result error';
        resultEl.textContent = 'Error: ' + e.message;
      }
    }

    async function loadChats() {
      try {
        const res = await fetch('/whatsapp/chats');
        const data = await res.json();
        const chatsEl = document.getElementById('chats');

        if (data.chats && data.chats.length > 0) {
          chatsEl.innerHTML = data.chats.map(c =>
            '<div class="chat" onclick="document.getElementById(\\'to\\').value=\\'' + c.jid.split('@')[0] + '\\'">' +
            '<strong>' + c.name + '</strong><br>' +
            '<small>' + c.jid + '</small>' +
            (c.lastMessage ? '<br><em>' + c.lastMessage.substring(0, 50) + '</em>' : '') +
            '</div>'
          ).join('');
        } else {
          chatsEl.innerHTML = '<p>No chats found</p>';
        }
      } catch (e) {
        console.error(e);
      }
    }

    updateStatus();
    setInterval(updateStatus, 10000);
  </script>
</body>
</html>
  `);
});

// Start server
const PORT_TO_USE = parseInt(process.env.WHATSAPP_PORT || '9377');

const server = app.listen(PORT_TO_USE, '0.0.0.0', () => {
  console.log(`[WhatsApp] Service started on port ${PORT_TO_USE}`);
  console.log(`[WhatsApp] Dashboard: http://localhost:${PORT_TO_USE}/whatsapp/dashboard`);

  // Auto-connect on startup
  initWhatsApp().catch(e => {
    console.log('[WhatsApp] Not yet connected - visit /whatsapp/dashboard to connect');
  });
});

module.exports = app;