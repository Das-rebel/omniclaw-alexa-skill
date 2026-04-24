/**
 * Email Manager Agent - CrewAI Agent
 * Acts as the central command for all email operations
 *
 * Responsibilities:
 * - Route email requests to appropriate agents
 * - Manage conversation context
 * - Coordinate multi-turn email interactions
 * - Handle pronoun resolution ("this email", "reply to him")
 */

const Crew = require('crewai').Crew;
const Agent = require('crewai').Agent;
const Task = require('crewai').Task;

const InboxAgent = require('./inbox-agent');
const DraftAgent = require('./draft-agent');
const SendAgent = require('./send-agent');

class EmailManagerAgent {
  constructor(config, resilience) {
    this.config = config;
    this.resilience = resilience;
    this.conversationContext = new Map();

    // Initialize sub-agents
    this.inboxAgent = new InboxAgent(config, resilience);
    this.draftAgent = new DraftAgent(config, resilience);
    this.sendAgent = new SendAgent(config, resilience);

    // Create CrewAI crew
    this.crew = new Crew({
      agents: [
        this.createManagerAgent(),
        this.inboxAgent.getAgent(),
        this.draftAgent.getAgent(),
        this.sendAgent.getAgent()
      ],
      process: 'hierarchical',
      managerAgent: this.createManagerAgent()
    });
  }

  /**
   * Create the manager agent definition
   */
  createManagerAgent() {
    return new Agent({
      role: 'Email Command Center',
      goal: 'Coordinate all email operations and route requests to the appropriate specialist agent',
      backstory: `You are the Email Command Center, an expert at understanding user intent and routing
      email requests to the right specialist. You manage conversation context and handle multi-turn
      interactions. You excel at pronoun resolution and maintaining conversation flow.`,
      verbose: true,
      allowDelegation: true,
      memory: true
    });
  }

  /**
   * Handle incoming Alexa email request
   */
  async handleEmailRequest(request) {
    const { userId, intent, slots, sessionId } = request;

    try {
      // Get or create conversation context
      const context = this.getOrCreateContext(userId, sessionId);

      // Route to appropriate handler
      const result = await this.routeRequest(intent, slots, context);

      // Update context
      this.updateContext(userId, sessionId, result);

      return result;
    } catch (error) {
      console.error('EmailManager error:', error);
      return this.resilience.createAlexaErrorResponse(
        'email_manager',
        error.message
      );
    }
  }

  /**
   * Route request to appropriate agent
   */
  async routeRequest(intent, slots, context) {
    switch (intent) {
      case 'CheckEmailIntent':
        return await this.handleCheckEmail(slots, context);

      case 'ComposeEmailIntent':
        return await this.handleComposeEmail(slots, context);

      case 'ReplyToEmailIntent':
        return await this.handleReplyToEmail(slots, context);

      case 'SendEmailIntent':
        return await this.handleSendEmail(slots, context);

      case 'SearchEmailIntent':
        return await this.handleSearchEmail(slots, context);

      default:
        return {
          speech: "I'm not sure what you want to do with your email. You can ask me to check, compose, reply, or search emails.",
          card: {
            title: 'Email Command',
            content: 'Available actions: Check email, Compose, Reply, Search'
          }
        };
    }
  }

  /**
   * Handle check email request
   */
  async handleCheckEmail(slots, context) {
    const { folder = 'inbox', count = 5, filter } = slots;

    const task = new Task({
      description: `Check ${folder} and retrieve the ${count} most recent emails${filter ? ` matching filter: ${filter}` : ''}`,
      agent: this.inboxAgent.getAgent(),
      expectedOutput: 'List of recent emails with summaries'
    });

    const result = await this.resilience.withFullResilience(
      () => this.crew.kickoff([task]),
      {
        timeout: 30000,
        maxRetries: 3,
        context: { operation: 'check_email' }
      }
    );

    return this.formatEmailSummary(result, context);
  }

  /**
   * Handle compose email request
   */
  async handleComposeEmail(slots, context) {
    const { recipient, subject, message, tone = 'professional' } = slots;

    const task = new Task({
      description: `Compose email to ${recipient} with subject: ${subject}. Message: ${message}. Tone: ${tone}`,
      agent: this.draftAgent.getAgent(),
      expectedOutput: 'Drafted email ready for review'
    });

    const result = await this.resilience.withFullResilience(
      () => this.crew.kickoff([task]),
      {
        timeout: 30000,
        maxRetries: 3,
        context: { operation: 'compose_email' }
      }
    );

    // Store draft for potential send
    context.lastDraft = result;

    return {
      speech: `I've drafted an email to ${recipient}. ${result.summary}`,
      card: {
        title: `Email to ${recipient}`,
        content: result.draft
      },
      context: result.draft
    };
  }

  /**
   * Handle reply to email request
   */
  async handleReplyToEmail(slots, context) {
    // Resolve pronoun references
    const emailId = this.resolveEmailReference(slots.emailReference, context);

    if (!emailId) {
      return {
        speech: "Which email would you like to reply to? Please specify the sender or subject.",
        card: {
          title: 'Email Reply',
          content: 'Please specify which email to reply to'
        }
      };
    }

    const { message, tone = 'professional' } = slots;

    const task = new Task({
      description: `Reply to email ${emailId} with message: ${message}. Tone: ${tone}`,
      agent: this.draftAgent.getAgent(),
      expectedOutput: 'Drafted reply ready for review'
    });

    const result = await this.resilience.withFullResilience(
      () => this.crew.kickoff([task]),
      {
        timeout: 30000,
        maxRetries: 3,
        context: { operation: 'reply_email' }
      }
    );

    context.lastDraft = result;
    context.replyToEmailId = emailId;

    return {
      speech: `I've drafted a reply. ${result.summary}`,
      card: {
        title: 'Reply Draft',
        content: result.draft
      },
      context: result.draft
    };
  }

  /**
   * Handle send email request
   */
  async handleSendEmail(slots, context) {
    const emailToSend = context.lastDraft || slots.draft;

    if (!emailToSend) {
      return {
        speech: "I don't have an email to send. Would you like to compose one?",
        card: {
          title: 'No Email to Send',
          content: 'Compose an email first'
        }
      };
    }

    const task = new Task({
      description: 'Send the drafted email',
      agent: this.sendAgent.getAgent(),
      expectedOutput: 'Confirmation that email was sent'
    });

    const result = await this.resilience.withFullResilience(
      () => this.crew.kickoff([task]),
      {
        timeout: 30000,
        maxRetries: 3,
        context: { operation: 'send_email' }
      }
    );

    // Clear draft after sending
    context.lastDraft = null;

    return {
      speech: result.message,
      card: {
        title: 'Email Sent',
        content: result.details
      }
    };
  }

  /**
   * Handle search email request
   */
  async handleSearchEmail(slots, context) {
    const { query, folder = 'all' } = slots;

    const task = new Task({
      description: `Search emails in ${folder} for: ${query}`,
      agent: this.inboxAgent.getAgent(),
      expectedOutput: 'List of matching emails with summaries'
    });

    const result = await this.resilience.withFullResilience(
      () => this.crew.kickoff([task]),
      {
        timeout: 30000,
        maxRetries: 3,
        context: { operation: 'search_email' }
      }
    );

    return this.formatEmailSummary(result, context);
  }

  /**
   * Resolve pronoun references to emails
   */
  resolveEmailReference(reference, context) {
    if (!reference) {
      // Use last mentioned email
      return context.lastMentionedEmailId;
    }

    // Handle pronouns
    if (reference.toLowerCase() === 'this' || reference.toLowerCase() === 'that') {
      return context.lastMentionedEmailId;
    }

    if (reference.toLowerCase() === 'him' || reference.toLowerCase() === 'her') {
      return context.lastMentionedEmailId;
    }

    // Search through recent emails for match
    const recentEmails = context.recentEmails || [];
    const match = recentEmails.find(email =>
      email.from.toLowerCase().includes(reference.toLowerCase()) ||
      email.subject.toLowerCase().includes(reference.toLowerCase())
    );

    return match ? match.id : null;
  }

  /**
   * Format email summary for Alexa response
   */
  formatEmailSummary(emails, context) {
    // Keep response under 150 words for TTS
    let summary = `You have ${emails.length} emails.`;

    const maxEmails = Math.min(3, emails.length);
    for (let i = 0; i < maxEmails; i++) {
      const email = emails[i];
      summary += ` ${i + 1}. From ${email.from}: ${email.snippet}`;
    }

    if (emails.length > maxEmails) {
      summary += ` And ${emails.length - maxEmails} more.`;
    }

    // Store recent emails for context
    context.recentEmails = emails.slice(0, 10);
    if (emails.length > 0) {
      context.lastMentionedEmailId = emails[0].id;
    }

    return {
      speech: summary,
      card: {
        title: 'Recent Emails',
        content: this.formatEmailCard(emails)
      },
      emails: emails
    };
  }

  /**
   * Format emails for card display
   */
  formatEmailCard(emails) {
    return emails.map(email =>
      `From: ${email.from}\nSubject: ${email.subject}\n\n${email.snippet}`
    ).join('\n---\n');
  }

  /**
   * Get or create conversation context
   */
  getOrCreateContext(userId, sessionId) {
    const key = `${userId}_${sessionId}`;
    if (!this.conversationContext.has(key)) {
      this.conversationContext.set(key, {
        userId,
        sessionId,
        lastMentionedEmailId: null,
        lastDraft: null,
        recentEmails: []
      });
    }
    return this.conversationContext.get(key);
  }

  /**
   * Update conversation context
   */
  updateContext(userId, sessionId, result) {
    const key = `${userId}_${sessionId}`;
    if (this.conversationContext.has(key)) {
      const context = this.conversationContext.get(key);
      context.timestamp = new Date();
    }
  }

  /**
   * Clean up old contexts
   */
  cleanup() {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, context] of this.conversationContext.entries()) {
      if (now - context.timestamp > maxAge) {
        this.conversationContext.delete(key);
      }
    }
  }
}

module.exports = EmailManagerAgent;
