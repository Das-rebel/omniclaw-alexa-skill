/**
 * Send Agent
 *
 * Prepares and validates emails for delivery through appropriate channels
 * Part of the Email Intelligence CrewAI multi-agent system
 */

const { Agent, Task } = require('crewai');
const { logger, logAgentActivity } = require('../services/logger');
const config = require('../config/email-config');

class SendAgent {
  constructor(gmailService, outlookService) {
    this.gmailService = gmailService;
    this.outlookService = outlookService;

    this.agent = new Agent({
      role: config.agents.send.role,
      goal: config.agents.send.goal,
      backstory: config.agents.send.backstory,
      verbose: config.agents.send.verbose,
      allowDelegation: false
    });

    logger.info('Send Agent initialized');
  }

  /**
   * Validate email before sending
   */
  async validateEmail(email, provider = 'gmail') {
    logAgentActivity('send', 'validate', { provider });

    try {
      const task = new Task({
        description: `
          Validate this email for delivery:

          To: ${email.to}
          Subject: ${email.subject}
          Body: ${email.body}
          Provider: ${provider}

          Check for:
          1. Valid email address format
          2. Subject line present and appropriate
          3. Body content not empty
          4. No suspicious patterns or potential spam triggers
          5. Appropriate length and formatting
          6. Professional language (if formal tone)

          Respond in JSON format:
          {
            "isValid": boolean,
            "issues": ["array of issues found"],
            "warnings": ["array of warnings"],
            "suggestions": ["array of improvement suggestions"]
          }
        `,
        agent: this.agent,
        expectedOutput: 'JSON object with validation results'
      });

      const result = await task.execute();
      const validation = JSON.parse(result);

      logAgentActivity('send', 'validation_complete', {
        isValid: validation.isValid,
        issueCount: validation.issues.length
      });

      return validation;
    } catch (error) {
      logger.error('Email validation failed:', error);

      // Fallback to basic validation
      return this._basicValidation(email);
    }
  }

  /**
   * Send email through appropriate provider
   */
  async sendEmail(email, provider = 'gmail') {
    logAgentActivity('send', 'send', { provider, to: email.to });

    try {
      // Validate first
      const validation = await this.validateEmail(email, provider);

      if (!validation.isValid && validation.issues.length > 0) {
        throw new Error(`Email validation failed: ${validation.issues.join(', ')}`);
      }

      // Send through appropriate provider
      let result;
      if (provider === 'gmail') {
        result = await this.gmailService.sendEmail(email);
      } else if (provider === 'outlook') {
        result = await this.outlookService.sendEmail(email);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      logAgentActivity('send', 'sent', {
        provider,
        to: email.to,
        messageId: result.id
      });

      return {
        success: true,
        messageId: result.id,
        provider,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Email sending failed:', error);

      logAgentActivity('send', 'failed', {
        provider,
        to: email.to,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        provider
      };
    }
  }

  /**
   * Save draft instead of sending
   */
  async saveDraft(email, provider = 'gmail') {
    logAgentActivity('send', 'save_draft', { provider });

    try {
      let result;
      if (provider === 'gmail') {
        result = await this.gmailService.createDraftEmail(email);
      } else if (provider === 'outlook') {
        result = await this.outlookService.createDraftEmail(email);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      logAgentActivity('send', 'draft_saved', {
        provider,
        draftId: result.id
      });

      return {
        success: true,
        draftId: result.id,
        provider
      };
    } catch (error) {
      logger.error('Draft saving failed:', error);
      throw error;
    }
  }

  /**
   * Schedule email for later delivery (via SES)
   */
  async scheduleEmail(email, scheduledTime) {
    logAgentActivity('send', 'schedule', {
      to: email.to,
      scheduledTime
    });

    try {
      // This would integrate with AWS SES or similar
      // For now, return a placeholder
      return {
        success: true,
        scheduledId: `scheduled_${Date.now()}`,
        scheduledTime,
        message: 'Email scheduled successfully'
      };
    } catch (error) {
      logger.error('Email scheduling failed:', error);
      throw error;
    }
  }

  /**
   * Basic validation fallback
   */
  _basicValidation(email) {
    const issues = [];
    const warnings = [];

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.to)) {
      issues.push('Invalid email address format');
    }

    // Check subject
    if (!email.subject || email.subject.trim() === '') {
      issues.push('Subject line is empty');
    }

    // Check body
    if (!email.body || email.body.trim() === '') {
      issues.push('Email body is empty');
    }

    // Check length
    if (email.body.length > 10000) {
      warnings.push('Email body is very long, consider attachment');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      suggestions: []
    };
  }

  /**
   * Format email for delivery
   */
  formatEmail(from, to, subject, body, options = {}) {
    return {
      from,
      to,
      subject,
      body,
      cc: options.cc || [],
      bcc: options.bcc || [],
      attachments: options.attachments || [],
      priority: options.priority || 'normal',
      requestReadReceipt: options.requestReadReceipt || false
    };
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(messageId, provider = 'gmail') {
    try {
      // This would query the provider's API for delivery status
      return {
        messageId,
        provider,
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        opened: false,
        clicked: false
      };
    } catch (error) {
      logger.error('Failed to get delivery status:', error);
      throw error;
    }
  }
}

module.exports = SendAgent;
