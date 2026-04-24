/**
 * Gmail Service
 *
 * Handles all Gmail API operations with OAuth2 authentication
 * Integrates with resilience layer for robustness
 */

const { google } = require('googleapis');
const { createResilientFunction } = require('../../../shared/resilience');
const { logger, logApiCall } = require('./logger');
const config = require('../config/email-config');

class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.initialized = false;
  }

  /**
   * Initialize Gmail service with OAuth2 credentials
   */
  initialize(credentials) {
    try {
      this.oauth2Client = new google.auth.OAuth2(
        config.gmail.oauth.clientId,
        config.gmail.oauth.clientSecret,
        config.gmail.oauth.redirectUri
      );

      // Set credentials
      this.oauth2Client.setCredentials(credentials);

      // Create Gmail API client
      this.gmail = google.gmail({
        version: 'v1',
        auth: this.oauth2Client
      });

      // Wrap API methods with resilience
      this._wrapApiMethods();

      this.initialized = true;
      logger.info('Gmail service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gmail service:', error);
      throw error;
    }
  }

  /**
   * Wrap Gmail API methods with resilience patterns
   */
  _wrapApiMethods() {
    // List messages with resilience
    this.listMessages = createResilientFunction(
      async (options = {}) => {
        const startTime = Date.now();
        try {
          const response = await this.gmail.users.messages.list({
            userId: 'me',
            maxResults: options.maxResults || config.gmail.limits.maxEmailsPerFetch,
            q: options.query || '',
            labelIds: options.labelIds || ['INBOX']
          });

          logApiCall('gmail', 'messages.list', Date.now() - startTime, true);
          return response.data;
        } catch (error) {
          logApiCall('gmail', 'messages.list', Date.now() - startTime, false);
          throw error;
        }
      },
      {
        name: 'gmail.listMessages',
        timeout: config.gmail.api.timeout,
        maxRetries: config.gmail.api.maxRetries
      }
    );

    // Get message with resilience
    this.getMessage = createResilientFunction(
      async (messageId, format = 'full') => {
        const startTime = Date.now();
        try {
          const response = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: format
          });

          logApiCall('gmail', 'messages.get', Date.now() - startTime, true);
          return response.data;
        } catch (error) {
          logApiCall('gmail', 'messages.get', Date.now() - startTime, false);
          throw error;
        }
      },
      {
        name: 'gmail.getMessage',
        timeout: config.gmail.api.timeout,
        maxRetries: config.gmail.api.maxRetries
      }
    );

    // Send message with resilience
    this.sendMessage = createResilientFunction(
      async (email) => {
        const startTime = Date.now();
        try {
          const response = await this.gmail.users.messages.send({
            userId: 'me',
            resource: {
              raw: this._encodeEmail(email)
            }
          });

          logApiCall('gmail', 'messages.send', Date.now() - startTime, true);
          return response.data;
        } catch (error) {
          logApiCall('gmail', 'messages.send', Date.now() - startTime, false);
          throw error;
        }
      },
      {
        name: 'gmail.sendMessage',
        timeout: config.gmail.api.timeout,
        maxRetries: config.gmail.api.maxRetries
      }
    );

    // Create draft with resilience
    this.createDraft = createResilientFunction(
      async (email) => {
        const startTime = Date.now();
        try {
          const response = await this.gmail.users.drafts.create({
            userId: 'me',
            resource: {
              message: {
                raw: this._encodeEmail(email)
              }
            }
          });

          logApiCall('gmail', 'drafts.create', Date.now() - startTime, true);
          return response.data;
        } catch (error) {
          logApiCall('gmail', 'drafts.create', Date.now() - startTime, false);
          throw error;
        }
      },
      {
        name: 'gmail.createDraft',
        timeout: config.gmail.api.timeout,
        maxRetries: config.gmail.api.maxRetries
      }
    );
  }

  /**
   * Fetch recent emails from inbox
   */
  async fetchRecentEmails(options = {}) {
    if (!this.initialized) {
      throw new Error('Gmail service not initialized');
    }

    const { maxResults = 10, query = '' } = options;

    try {
      // List messages
      const messages = await this.listMessages({ maxResults, query });

      // Fetch full message details
      const fullMessages = await Promise.all(
        messages.messages.map(msg => this.getMessage(msg.id))
      );

      // Parse and format messages
      return fullMessages.map(msg => this._parseMessage(msg));
    } catch (error) {
      logger.error('Failed to fetch recent emails:', error);
      throw error;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(email) {
    if (!this.initialized) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const result = await this.sendMessage(email);
      logger.info('Email sent successfully:', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Create a draft email
   */
  async createDraftEmail(email) {
    if (!this.initialized) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const result = await this.createDraft(email);
      logger.info('Draft created successfully:', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Failed to create draft:', error);
      throw error;
    }
  }

  /**
   * Parse Gmail message into standard format
   */
  _parseMessage(message) {
    const headers = message.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Extract body
    let body = '';
    if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      // Multipart message
      const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body,
      snippet: message.snippet,
      labelIds: message.labelIds,
      historyId: message.historyId
    };
  }

  /**
   * Encode email object to base64 for Gmail API
   */
  _encodeEmail(email) {
    const emailLines = [
      `From: ${email.from}`,
      `To: ${email.to}`,
      `Subject: ${email.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      email.body
    ];

    return Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Get authentication URL for OAuth2 flow
   */
  getAuthUrl(state = null) {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: config.gmail.oauth.scopes,
      state: state
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }
}

module.exports = GmailService;
