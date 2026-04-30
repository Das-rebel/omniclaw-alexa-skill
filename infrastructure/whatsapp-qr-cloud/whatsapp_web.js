/**
 * OmniClaw WhatsApp Web Service - Simplified
 * Uses whatsapp-web.js for reliable WhatsApp Web integration
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// WhatsApp Web client with local auth
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './whatsapp_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// QR Code storage
let latestQR = null;
let qrGeneratedAt = null;

// Client events
client.on('qr', async (qr) => {
    console.log('✅ QR Code received - scan quickly!');
    latestQR = qr;
    qrGeneratedAt = Date.now();
});

client.on('ready', () => {
    console.log('✅ WhatsApp Client is ready!');
    console.log('👤 User:', client.info?.pushname || client.info?.wid?.user);
    latestQR = null;
    qrGeneratedAt = null;
});

client.on('authenticated', () => {
    console.log('✅ Authentication successful');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was disconnected:', reason);
    if (reason === 'NAVIGATION') {
        console.log('🔄 Reconnecting...');
        client.initialize();
    }
});

// Initialize client
client.initialize().catch(err => {
    console.error('❌ Failed to initialize client:', err);
});

// API Routes
app.get('/health', (req, res) => {
    const info = client.info;
    res.json({
        service: 'omniclaw-whatsapp-web',
        status: 'healthy',
        connected: !!client.info,
        user: info ? (info.pushname || info.wid?.user) : null,
        phone: info ? (info.wid?.user || info.me?.user) : null
    });
});

app.get('/whatsapp/status', (req, res) => {
    const info = client.info;
    res.json({
        connected: !!client.info,
        authenticated: !!client.info,
        user: info ? (info.pushname || info.wid?.user) : null,
        phone: info ? (info.wid?.user || info.me?.user) : null,
        hasQR: !!latestQR
    });
});

app.get('/whatsapp/qr-image', async (req, res) => {
    try {
        if (client.info) {
            return res.json({ connected: true, message: 'Already connected' });
        }

        if (!latestQR) {
            return res.json({
                status: 'waiting',
                message: 'QR not yet available. Client is initializing...'
            });
        }

        const qrImage = await qrcode.toDataURL(latestQR);
        res.json({
            qr: qrImage,
            raw: latestQR,
            expiresAt: qrGeneratedAt ? qrGeneratedAt + 60000 : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/whatsapp/connect', async (req, res) => {
    try {
        console.log('🔄 Initializing WhatsApp client...');

        if (client.info) {
            return res.json({
                success: true,
                connected: true,
                message: 'Already connected'
            });
        }

        // Wait for QR (up to 30 seconds)
        const maxWait = 30000;
        const checkInterval = 2000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            if (latestQR) {
                return res.json({
                    success: true,
                    hasQR: true,
                    message: 'QR code ready - scan with WhatsApp',
                    hint: 'QR expires in 60 seconds'
                });
            }
            if (client.info) {
                return res.json({
                    success: true,
                    connected: true,
                    message: 'Already connected using existing session'
                });
            }
            await new Promise(r => setTimeout(r, checkInterval));
        }

        res.json({
            success: false,
            message: 'QR not generated yet - client still initializing',
            hint: 'Wait a bit longer or check logs'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/whatsapp/send', async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!client.info) {
            return res.status(503).json({ error: 'Not connected to WhatsApp' });
        }

        // Format phone number
        const chatId = to.includes('@') ? to : `${to}@c.us`;

        const result = await client.sendMessage(chatId, message);
        res.json({
            success: true,
            messageId: result.id.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard
app.get('/whatsapp/dashboard', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>OmniClaw WhatsApp Web</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d4ff; }
    .status { padding: 15px; background: #16213e; border-radius: 8px; margin: 20px 0; }
    .connected { border-left: 4px solid #00ff88; }
    .disconnected { border-left: 4px solid #ff4444; }
    button { width: 100%; padding: 12px; margin: 8px 0; border-radius: 5px; border: none; background: #00d4ff; color: #000; font-weight: bold; cursor: pointer; }
    button:hover { background: #00a8cc; }
    #qrSection { text-align: center; display: none; }
    #qrImage { max-width: 300px; border: 4px solid #00d4ff; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>🚀 OmniClaw WhatsApp Web</h1>

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
          statusEl.innerHTML = '<strong>✅ Connected</strong> - ' + (data.user || 'WhatsApp');
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
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 OmniClaw WhatsApp Web Service Started');
    console.log('📡 Dashboard: http://localhost:' + PORT + '/whatsapp/dashboard');
    console.log('🔍 Health: http://localhost:' + PORT + '/health');
});

module.exports = app;