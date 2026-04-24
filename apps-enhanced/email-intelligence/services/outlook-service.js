/**
 * Outlook Service
 *
 * Handles all Microsoft Graph API operations for Outlook
 * Integrates with resilience layer for robustness
 */

const axios = require('axios');
const { createResilientFunction } = require('../../../shared/resilience');
const { logger, logApiCall } = require('./logger');
const config = require('../config/email-config');

class OutlookService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.initialized = false;
  }

  /**
   * Initialize Outlook service with access token
   */
  initialize(tokens) {
    try {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;

      // Wrap API methods with resilience
      this._wrapApiMethods();

      this.initialized = true;
      logger.info('Outlook service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Outlook service:', error);
      throw error;
    }
  }

  /**
   * Wrap Outlook API methods with resilience patterns
   */
  _wrapApiMethods() {
    // Helper to make authenticated API calls
    const makeApiCall = async (endpoint, options = {}) => {
      const startTime = Date.now();
      try {
        const response = await axios({
          method: options.method || 'GET',
          url: `${config.outlook.api.baseUrl}${endpoint}`,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          ...options
        });

        logApiCall('outlook', endpoint, Date.now() - startTime, true);
        return response.data;
      } catch (error) {
        logApiCall('outlook', endpoint, Date.now() - startTime, false);
        throw error;
      }
    };

    // List messages with resilience
    this.listMessages = createResilientFunction(
      async (options = {}) => {
        const params = new URLSearchParams({
          $top: options.maxResults || config.outlook.limits.maxEmailsPerFetch,
          $orderby: 'receivedDateTime desc'
        });

        if (options.query) {
          params.append('$search', `"${options.query}"`);
        }

        if (options.folderId) {
          return await makeApiCall(`/mailFolders/${options.folderId}/messages?${params}`);
        }

        return await makeApiCall(`/messages?${params}`);
      },
      {
        name: 'outlook.listMessages',
        timeout: config.outlook.api.timeout,
        maxRetries: config.outlook.api.maxRetries
      }
    );

    // Get message with resilience
    this.getMessage = createResilientFunction(
      async (messageId) => {
        return await makeApiCall(`/messages/${messageId}`);
      },
      {
        name: 'outlook.getMessage',
        timeout: config.outlook.api.timeout,
        maxRetries: config.outlook.api.maxRetries
      }
    );

    // Send message with resilience
    this.sendMessage = createResilientFunction(
      async (email) => {
        const message = {
          message: {
            subject: email.subject,
            body: {
              contentType: 'Text',
              content: email.body
            },
            toRecipients: [
              {
                emailAddress: {
                  address: email.to
                }
              }
            ]
          }
        };

        return await makeApiCall('/send', {
          method: 'POST',
          data: message
        });
      },
      {
        name: 'outlook.sendMessage',
        timeout: config.outlook.api.timeout,
        maxRetries: config.outlook.api.maxRetries
      }
    );

    // Create draft with resilience
    this.createDraft = createResilientFunction(
      async (email) => {
        const message = {
          subject: email.subject,
          body: {
            contentType: 'Text',
            content: email.body
          },
          toRecipients: [
            {
              emailAddress: {
                address: email.to
              }
            }
          ]
        };

        return await makeApiCall('/messages', {
          method: 'POST',
          data: message
        });
      },
      {
        name: 'outlook.createDraft',
        timeout: config.outlook.api.timeout,
        maxRetries: config.outlook.api.maxRetries
      }
    );
  }

  /**
   * Fetch recent emails from inbox
   */
  async fetchRecentEmails(options = {}) {
    if (!this.initialized) {
      throw new Error('Outlook service not initialized');
    }

    const { maxResults = 10, query = '' } = options;

    try {
      // List messages
      const response = await this.listMessages({ maxResults, query });

      // Parse and format messages
      return response.value.map(msg => this._parseMessage(msg));
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
      throw new Error('Outlook service not initialized');
    }

    try {
      await this.sendMessage(email);
      logger.info('Email sent successfully via Outlook');
      return { success: true };
    } catch (error) {
      logger.error('Failed to send email via Outlook:', error);
      throw error;
    }
  }

  /**
   * Create a draft email
   */
  async createDraftEmail(email) {
    if (!this.initialized) {
      throw new Error('Outlook service not initialized');
    }

    try {
      const result = await this.createDraft(email);
      logger.info('Draft created successfully via Outlook:', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Failed to create draft via Outlook:', error);
      throw error;
    }
  }

  /**
   * Parse Outlook message into standard format
   */
  _parseMessage(message) {
    return {
      id: message.id,
      threadId: message.conversationId,
      from: message.from?.emailAddress?.address || '',
      to: message.toRecipients?.[0]?.emailAddress?.address || '',
      subject: message.subject || '',
      date: message.receivedDateTime,
      body: message.body?.content || '',
      snippet: message.bodyPreview || '',
      isRead: message.isRead,
      hasAttachments: message.hasAttachments,
      importance: message.importance
    };
  }

  /**
   * Get authentication URL for OAuth2 flow
   */
  getAuthUrl(state = null) {
    const params = new URLSearchParams({
      client_id: config.outlook.oauth.clientId,
      response_type: 'code',
      redirect_uri: config.outlook.oauth.redirectUri,
      scope: config.outlook.oauth.scopes.join(' '),
      response_mode: 'query',
      state: state || ''
    });

    return `https://login.microsoftonline.com/${config.outlook.oauth.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${config.outlook.oauth.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: config.outlook.oauth.clientId,
          client_secret: config.outlook.oauth.clientSecret,
          code: code,
          redirect_uri: config.outlook.oauth.redirectUri,
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshTokens() {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${config.outlook.oauth.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: config.outlook.oauth.clientId,
          client_secret: config.outlook.oauth.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      logger.error('Failed to refresh tokens:', error);
      throw error;
    }
  }
}

module.exports = OutlookService;
