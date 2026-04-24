/**
 * Email Intelligence API
 *
 * Cloud Functions Gen 2 endpoints for Alexa integration
 * Provides REST API for email operations
 */

const express = require('express');
const { logger } = require('../services/logger');
const { ManagerAgent } = require('../agents/manager-agent');
const { GmailService } = require('../services/gmail-service');
const { OutlookService } = require('../services/outlook-service');
const { createResilientFunction } = require('../../../shared/resilience');

// Resilience wrappers
const { ResilientGmailService, ResilientOutlookService } = require('../resilient-email-clients');

const router = express.Router();

/**
 * Initialize services (would be done with proper auth in production)
 */
let managerAgent = null;

function initializeServices() {
  if (managerAgent) return managerAgent;

  try {
    // Initialize base services (in production, load from database/Secret Manager)
    const gmailService = new GmailService();
    const outlookService = new OutlookService();

    // Wrap with resilience
    const resilientGmail = new ResilientGmailService(gmailService);
    const resilientOutlook = new ResilientOutlookService(outlookService);

    // Initialize with credentials (placeholder)
    // gmailService.initialize(credentials);

    // Initialize LLM client
    const llmClient = {
      // OpenAI or similar LLM client
    };

    managerAgent = new ManagerAgent(llmClient, resilientGmail, resilientOutlook);
    logger.info('Email Intelligence API initialized with resilient clients');

    return managerAgent;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * GET /api/email/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'email-intelligence',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * POST /api/email/check
 * Check and analyze recent emails
 * Body: { provider: 'gmail'|'outlook', limit: number }
 */
router.post('/check', async (req, res) => {
  try {
    const manager = initializeServices();
    const request = {
      type: 'CHECK_EMAIL',
      ...req.body
    };

    const result = await manager.processRequest(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Email check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/summarize
 * Summarize a specific email
 * Body: { emailId: string, provider: 'gmail'|'outlook' }
 */
router.post('/summarize', async (req, res) => {
  try {
    const manager = initializeServices();
    const request = {
      type: 'SUMMARIZE_EMAIL',
      ...req.body
    };

    const result = await manager.processRequest(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Email summarization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/reply
 * Compose a reply to an email
 * Body: { emailId: string, instruction: string, tone: 'formal'|'casual'|'brief', provider: 'gmail'|'outlook' }
 */
router.post('/reply', async (req, res) => {
  try {
    const manager = initializeServices();
    const request = {
      type: 'COMPOSE_REPLY',
      ...req.body
    };

    const result = await manager.processRequest(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Reply composition failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/send
 * Send an email
 * Body: { email: { to, subject, body }, provider: 'gmail'|'outlook' }
 */
router.post('/send', async (req, res) => {
  try {
    const manager = initializeServices();
    const request = {
      type: 'SEND_EMAIL',
      ...req.body
    };

    const result = await manager.processRequest(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Email sending failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/search
 * Search emails
 * Body: { query: string, provider: 'gmail'|'outlook', limit: number }
 */
router.post('/search', async (req, res) => {
  try {
    const manager = initializeServices();
    const request = {
      type: 'SEARCH_EMAILS',
      ...req.body
    };

    const result = await manager.processRequest(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Email search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/drafts/variants
 * Generate multiple draft variants
 * Body: { emailId: string, instruction: string, provider: 'gmail'|'outlook' }
 */
router.post('/drafts/variants', async (req, res) => {
  try {
    const manager = initializeServices();
    const request = {
      type: 'DRAFT_VARIANTS',
      ...req.body
    };

    const result = await manager.processRequest(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Draft variant generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/auth/gmail
 * Get Gmail OAuth2 authorization URL
 */
router.get('/auth/gmail', (req, res) => {
  try {
    const gmailService = new GmailService();
    const state = req.query.state || null;
    const authUrl = gmailService.getAuthUrl(state);

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    logger.error('Gmail auth URL generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/auth/gmail/callback
 * Handle Gmail OAuth2 callback
 */
router.post('/auth/gmail/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const gmailService = new GmailService();
    const tokens = await gmailService.getTokens(code);

    // In production, save tokens to database/Secret Manager
    res.json({
      success: true,
      message: 'Gmail connected successfully',
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      }
    });
  } catch (error) {
    logger.error('Gmail auth callback failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/auth/outlook
 * Get Outlook OAuth2 authorization URL
 */
router.get('/auth/outlook', (req, res) => {
  try {
    const outlookService = new OutlookService();
    const state = req.query.state || null;
    const authUrl = outlookService.getAuthUrl(state);

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    logger.error('Outlook auth URL generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/auth/outlook/callback
 * Handle Outlook OAuth2 callback
 */
router.post('/auth/outlook/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const outlookService = new OutlookService();
    const tokens = await outlookService.getTokens(code);

    // In production, save tokens to database/Secret Manager
    res.json({
      success: true,
      message: 'Outlook connected successfully',
      tokens
    });
  } catch (error) {
    logger.error('Outlook auth callback failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
