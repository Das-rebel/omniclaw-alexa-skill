/**
 * Draft Agent
 *
 * Composes well-structured email responses in different tones
 * Part of the Email Intelligence CrewAI multi-agent system
 */

const { Agent, Task } = require('crewai');
const { logger, logAgentActivity } = require('../services/logger');
const config = require('../config/email-config');

class DraftAgent {
  constructor(llmClient) {
    this.llmClient = llmClient;
    this.agent = new Agent({
      role: config.agents.draft.role,
      goal: config.agents.draft.goal,
      backstory: config.agents.draft.backstory,
      verbose: config.agents.draft.verbose,
      allowDelegation: false
    });

    logger.info('Draft Agent initialized');
  }

  /**
   * Draft a response email
   */
  async draftResponse(originalEmail, userInstruction, tone = 'formal') {
    logAgentActivity('draft', 'compose', {
      originalEmailId: originalEmail.id,
      tone
    });

    try {
      const task = new Task({
        description: `
          Compose a response email with the following parameters:

          Original Email:
          From: ${originalEmail.from}
          Subject: ${originalEmail.subject}
          Body: ${originalEmail.body}

          User Instruction: ${userInstruction}

          Tone: ${tone}
          - formal: Professional, polite, suitable for business
          - casual: Friendly, relaxed, suitable for colleagues
          - brief: Concise, to-the-point, minimal pleasantries

          Guidelines:
          - Keep it under ${config.processing.drafts.maxLength} words
          - Address key points from the original email
          - Include call-to-action or next steps if needed
          - Maintain professional etiquette

          Respond in JSON format:
          {
            "subject": "Re: Original Subject",
            "body": "Full email body",
            "tone": "${tone}",
            "wordCount": number
          }
        `,
        agent: this.agent,
        expectedOutput: 'JSON object with drafted email'
      });

      const result = await task.execute();
      const draft = JSON.parse(result);

      logAgentActivity('draft', 'composition_complete', {
        originalEmailId: originalEmail.id,
        tone,
        wordCount: draft.wordCount
      });

      return draft;
    } catch (error) {
      logger.error('Email drafting failed:', error);

      // Fallback to template-based drafting
      return this._fallbackDraft(originalEmail, userInstruction, tone);
    }
  }

  /**
   * Generate multiple draft variants
   */
  async draftVariants(originalEmail, userInstruction) {
    const variants = {};
    const tones = config.processing.drafts.variants;

    for (const tone of tones) {
      try {
        variants[tone] = await this.draftResponse(originalEmail, userInstruction, tone);
      } catch (error) {
        logger.error(`Failed to draft ${tone} variant:`, error);
      }
    }

    return variants;
  }

  /**
   * Fallback template-based drafting
   */
  _fallbackDraft(originalEmail, userInstruction, tone) {
    const templates = {
      formal: {
        greeting: 'Dear',
        closing: 'Best regards'
      },
      casual: {
        greeting: 'Hi',
        closing: 'Thanks'
      },
      brief: {
        greeting: '',
        closing: ''
      }
    };

    const template = templates[tone] || templates.formal;

    // Extract sender name
    const senderName = originalEmail.from.split('<')[0].trim();

    // Build subject
    const subject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    // Build body
    let body = '';

    if (template.greeting) {
      body += `${template.greeting} ${senderName},\n\n`;
    }

    body += `Thank you for your email regarding "${originalEmail.subject}".\n\n`;

    if (userInstruction) {
      body += `${userInstruction}\n\n`;
    } else {
      body += `I have received your message and will review it shortly.\n\n`;
    }

    if (template.closing) {
      body += `${template.closing}`;
    }

    return {
      subject,
      body,
      tone,
      wordCount: body.split(/\s+/).length
    };
  }

  /**
   * Edit existing draft
   */
  async editDraft(draft, editInstructions) {
    logAgentActivity('draft', 'edit', { tone: draft.tone });

    try {
      const task = new Task({
        description: `
          Edit this draft email based on instructions:

          Current Draft:
          Subject: ${draft.subject}
          Body: ${draft.body}

          Edit Instructions: ${editInstructions}

          Maintain the ${draft.tone} tone.

          Respond in JSON format:
          {
            "subject": "Updated subject",
            "body": "Updated body",
            "changes": ["list of changes made"]
          }
        `,
        agent: this.agent,
        expectedOutput: 'JSON object with edited draft'
      });

      const result = await task.execute();
      const edited = JSON.parse(result);

      logAgentActivity('draft', 'edit_complete', {
        changes: edited.changes.length
      });

      return edited;
    } catch (error) {
      logger.error('Draft editing failed:', error);
      throw error;
    }
  }

  /**
   * Suggest improvements to a draft
   */
  async suggestImprovements(draft) {
    try {
      const task = new Task({
        description: `
          Review this draft email and suggest improvements:

          Subject: ${draft.subject}
          Body: ${draft.body}
          Tone: ${draft.tone}

          Suggest improvements for:
          1. Clarity and readability
          2. Tone consistency
          3. Grammar and spelling
          4. Professional etiquette
          5. Effectiveness

          Respond in JSON format:
          {
            "improvements": [
              {
                "category": "string",
                "suggestion": "string",
                "priority": "high|medium|low"
              }
            ],
            "overallScore": number
          }
        `,
        agent: this.agent,
        expectedOutput: 'JSON object with improvement suggestions'
      });

      const result = await task.execute();
      return JSON.parse(result);
    } catch (error) {
      logger.error('Improvement suggestions failed:', error);
      throw error;
    }
  }
}

module.exports = DraftAgent;
