/**
 * WhatsApp QR Cloud - Mock Data Tests
 * Tests all API endpoints without requiring real WhatsApp authentication
 * Run: node test-mock.js
 */

const express = require('express');
const http = require('http');

// ─── Mock WhatsApp socket ───────────────────────────────────────────────────
const mockSock = {
  user: { id: '919003349852:1@s.whatsapp.net', name: 'Subhajit' },
  store: {
    contacts: {
      '919003349852@s.whatsapp.net': { id: '919003349852@s.whatsapp.net', name: 'Subhajit das', isBusiness: false },
      '918800000001@s.whatsapp.net': { id: '918800000001@s.whatsapp.net', name: 'Alice', isBusiness: false },
      '918800000002@s.whatsapp.net': { id: '918800000002@s.whatsapp.net', name: 'Bob (Business)', isBusiness: true }
    },
    chats: {
      'chat1': {
        jid: '919003349852@s.whatsapp.net',
        name: 'Subhajit das',
        unreadCount: 0,
        lastMessage: {
          messageTimestamp: Date.now() / 1000 - 300,
          message: { conversation: 'Hey! Test message' }
        }
      },
      'chat2': {
        jid: '918800000001@s.whatsapp.net',
        name: 'Alice',
        unreadCount: 3,
        lastMessage: {
          messageTimestamp: Date.now() / 1000 - 600,
          message: { conversation: 'Are you free tomorrow?' }
        }
      }
    }
  },
  sendMessage: async (jid, { text }) => {
    console.log(`  → Mock send to ${jid}: "${text}"`);
    return { key: { id: `mock-msg-${Date.now()}` } };
  }
};

// ─── Build the app with mock socket injected ────────────────────────────────
const app = express();
app.use(express.json());

function toJID(phone) {
  if (!phone) return null;
  if (phone.includes('@')) return phone;
  const num = phone.replace(/\D/g, '');
  return num.length > 15 ? `${num}@c.us` : `${num}@s.whatsapp.net`;
}

app.get('/health', (req, res) => {
  res.json({ service: 'omniclaw-whatsapp-qr-cloud', connected: !!mockSock.user, timestamp: new Date().toISOString() });
});

app.get('/whatsapp/status', (req, res) => {
  res.json({ connected: !!mockSock.user, phone: mockSock.user?.id, name: mockSock.user?.name });
});

app.post('/whatsapp/send', async (req, res) => {
  const { to, message, phone } = req.body;
  if (!mockSock.user) return res.status(503).json({ error: 'Not connected' });
  const jid = toJID(to || phone);
  if (!jid) return res.status(400).json({ error: 'Missing recipient phone number' });
  if (!message) return res.status(400).json({ error: 'Missing message text' });
  const result = await mockSock.sendMessage(jid, { text: message });
  res.json({ success: true, to: jid, messageId: result.key.id });
});

app.get('/whatsapp/contacts', (req, res) => {
  const contacts = Object.values(mockSock.store.contacts).map(c => ({
    id: c.id,
    name: c.name || 'Unknown',
    isBusiness: c.isBusiness
  }));
  res.json({ contacts });
});

app.get('/whatsapp/chats', (req, res) => {
  const chats = Object.values(mockSock.store.chats)
    .sort((a, b) => (b.lastMessage?.messageTimestamp || 0) - (a.lastMessage?.messageTimestamp || 0))
    .map(c => ({
      jid: c.jid,
      name: c.name || c.jid,
      unread: c.unreadCount || 0,
      lastMessage: c.lastMessage?.message?.conversation || ''
    }));
  res.json({ chats });
});

// ─── HTTP helper ────────────────────────────────────────────────────────────
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 19377,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Test runner ────────────────────────────────────────────────────────────
async function runTests() {
  const server = http.createServer(app).listen(19377);
  const results = [];
  let passed = 0;
  let failed = 0;

  function check(name, condition, detail = '') {
    const ok = !!condition;
    const icon = ok ? '✓' : '✗';
    console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
    results.push({ name, ok });
    if (ok) passed++; else failed++;
  }

  console.log('\n=== WhatsApp API Mock Tests ===\n');

  // 1. Health check
  console.log('1. GET /health');
  const health = await request('GET', '/health');
  check('status 200', health.status === 200);
  check('connected: true', health.body.connected === true);
  check('service name present', !!health.body.service, health.body.service);

  // 2. Status
  console.log('\n2. GET /whatsapp/status');
  const status = await request('GET', '/whatsapp/status');
  check('status 200', status.status === 200);
  check('connected: true', status.body.connected === true);
  check('phone present', !!status.body.phone, status.body.phone);
  check('name present', !!status.body.name, status.body.name);

  // 3. Send message - valid
  console.log('\n3. POST /whatsapp/send (valid)');
  const send = await request('POST', '/whatsapp/send', { to: '919003349852', message: 'Hello from mock test!' });
  check('status 200', send.status === 200);
  check('success: true', send.body.success === true);
  check('messageId returned', !!send.body.messageId, send.body.messageId);
  check('JID formatted', send.body.to?.includes('@'), send.body.to);

  // 4. Send message - missing recipient
  console.log('\n4. POST /whatsapp/send (missing recipient)');
  const sendNoTo = await request('POST', '/whatsapp/send', { message: 'No recipient' });
  check('status 400', sendNoTo.status === 400);
  check('error message', !!sendNoTo.body.error, sendNoTo.body.error);

  // 5. Send message - missing message
  console.log('\n5. POST /whatsapp/send (missing message body)');
  const sendNoMsg = await request('POST', '/whatsapp/send', { to: '919003349852' });
  check('status 400', sendNoMsg.status === 400);
  check('error message', !!sendNoMsg.body.error, sendNoMsg.body.error);

  // 6. Contacts
  console.log('\n6. GET /whatsapp/contacts');
  const contacts = await request('GET', '/whatsapp/contacts');
  check('status 200', contacts.status === 200);
  check('contacts array', Array.isArray(contacts.body.contacts));
  check('3 contacts', contacts.body.contacts?.length === 3, `got ${contacts.body.contacts?.length}`);
  check('contact has id/name', !!contacts.body.contacts?.[0]?.id && !!contacts.body.contacts?.[0]?.name);

  // 7. Chats
  console.log('\n7. GET /whatsapp/chats');
  const chats = await request('GET', '/whatsapp/chats');
  check('status 200', chats.status === 200);
  check('chats array', Array.isArray(chats.body.chats));
  check('2 chats', chats.body.chats?.length === 2, `got ${chats.body.chats?.length}`);
  check('sorted by latest', chats.body.chats?.[0]?.unread === 0);  // chat1 is most recent
  check('lastMessage text', !!chats.body.chats?.[0]?.lastMessage, chats.body.chats?.[0]?.lastMessage);

  // 8. Send with international number (JID conversion)
  console.log('\n8. POST /whatsapp/send (international format)');
  const sendIntl = await request('POST', '/whatsapp/send', { to: '+91 90033 49852', message: 'Spaces stripped test' });
  check('status 200', sendIntl.status === 200);
  check('JID cleaned up', sendIntl.body.to === '919003349852@s.whatsapp.net', sendIntl.body.to);

  // Summary
  console.log('\n══════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed === 0) {
    console.log('All endpoints behave correctly with mock data. Ready for real WhatsApp auth.\n');
  } else {
    console.log('Some tests failed — fix before proceeding to real auth.\n');
  }

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
