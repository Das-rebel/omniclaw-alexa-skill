/**
 * Cloud Functions Gen 2 Entry Point
 * main.js - Required by Cloud Build
 *
 * Cloud Functions Gen 2 runs as Cloud Run containers which require
 * the application to listen on PORT environment variable (default 8080).
 */

const express = require('express');
const { healthHandler, alexaHandler, syncHandler } = require('./index');

const app = express();

// Access Control headers for all responses
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  next();
});

app.use(express.json());

// Health check endpoints
app.get('/health', healthHandler);
app.get('/healthHandler', healthHandler);
// Root path handles both GET (health) and POST (Alexa requests)
app.all('/', (req, res) => {
  if (req.method === 'POST') {
    return alexaHandler(req, res);
  }
  return healthHandler(req, res);
});

// Alexa handler - accepts POST and GET
app.all('/alexaHandler', alexaHandler);
app.all('/alexa', alexaHandler);

// Bookmark sync endpoint (for Cloud Scheduler)
app.post('/sync/bookmarks', async (req, res) => {
  try {
    const { syncHandler } = require('./index');
    await syncHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Instagram sync endpoint
app.post('/api/sync/instagram', async (req, res) => {
  try {
    const { instagramSyncHandler } = require('./index');
    await instagramSyncHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Instagram bookmarks endpoint
app.get('/api/bookmarks/instagram', async (req, res) => {
  try {
    const { instagramBookmarksHandler } = require('./index');
    await instagramBookmarksHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Instagram scraper endpoint - direct scraper access using Puppeteer
app.post('/scrape/instagram', async (req, res) => {
  try {
    const DirectInstagramScraper = require('./clients/direct_instagram_scraper');
    const sessionId = req.body.sessionId || process.env.INSTAGRAM_SESSION_ID;

    // Parse session ID if URL encoded
    const actualSessionId = decodeURIComponent(sessionId || '');

    const scraper = new DirectInstagramScraper({
      cookies: {
        sessionid: actualSessionId,
        csrftoken: process.env.INSTAGRAM_CSRF_TOKEN,
        ds_user_id: process.env.INSTAGRAM_DS_USER_ID
      }
    });

    console.log('📸 Starting direct Instagram scrape with Puppeteer...');
    const savedContent = await scraper.scrapeSavedContent();

    res.json({
      success: true,
      savedContent: savedContent
    });
  } catch (error) {
    console.error('Direct Instagram scrape failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export handlers for Cloud Functions Gen 2
// These are invoked by the Cloud Functions framework
exports.alexaHandler = (req, res) => {
  app(req, res);
};

exports.healthHandler = healthHandler;
exports.syncHandler = (req, res) => {
  app(req, res);
};

// Start HTTP server on PORT=8080 for Cloud Run health checks
// This is required because Cloud Run containers must listen on the PORT env var
const PORT = process.env.PORT || 8080;

function startServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniClaw Cloud Function listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Alexa handler: http://localhost:${PORT}/alexaHandler`);
  });

  server.setTimeout(30 * 1000); // 30 second timeout for function invocations

  return server;
}

// Start server when run directly (local development)
if (require.main === module) {
  startServer();
}
