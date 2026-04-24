/**
 * Smart Reply Service
 * Generates context-aware reply suggestions using LLM
 *
 * @module apps/email-intelligence/services/smart-replies/smart-reply-service
 * @version 2.0.0 (Enhanced)
 */

const Anthropic = require('@anthropic-ai/sdk');

class SmartReplyService {
  constructor(options = {}) {
    this.anthropic = new Anthropic({
      apiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate reply suggestions
   * @param {object} email - Email object
   * @param {string} tone - Desired tone (formal, casual, brief)
   * @returns {Promise<Array>} - Reply suggestions
   */
  async generateReplies(email, tone = 'neutral') {
    const { subject, body, sender, threadHistory } = email;

    const prompt = this._buildPrompt(email, tone);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const suggestions = this._parseSuggestions(response.content[0].text);

    return {
      originalEmail: {
        subject,
        sender: sender.name,
      },
      tone,
      suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build prompt for reply generation
   * @private
   */
  _buildPrompt(email, tone) {
    const { subject, body, sender, threadHistory } = email;

    let prompt = `Generate 3 reply suggestions for this email:\n\n`;
    prompt += `Subject: ${subject}\n`;
    prompt += `From: ${sender.name} <${sender.email}>\n\n`;
    prompt += `Body:\n${body}\n\n`;

    if (threadHistory && threadHistory.length > 0) {
      prompt += `Previous messages in thread:\n`;
      threadHistory.forEach((msg, idx) => {
        prompt += `${idx + 1}. From ${msg.sender}: ${msg.body.substring(0, 200)}...\n`;
      });
      prompt += `\n`;
    }

    prompt += `Generate 3 different reply options:\n`;
    prompt += `1. ${this._getToneInstruction(tone)}\n`;
    prompt += `2. Alternative with different emphasis\n`;
    prompt += `3. Brief/concise version\n\n`;

    prompt += `For each reply, include:\n`;
    prompt += `- Subject line (if different from original)\n`;
    prompt += `- Body text\n`;
    prompt += `- Brief explanation of tone/approach\n\n`;

    prompt += `Format as JSON:\n`;
    prompt += `{\n`;
    prompt += `  "replies": [\n`;
    prompt += `    {\n`;
    prompt += `      "subject": "...",\n`;
    prompt += `      "body": "...",\n`;
    prompt += `      "explanation": "..."\n`;
    prompt += `    },\n`;
    prompt += `    ...\n`;
    prompt += `  ]\n`;
    prompt += `}\n`;

    return prompt;
  }

  /**
   * Get tone instruction
   * @private
   */
  _getToneInstruction(tone) {
    const toneInstructions = {
      formal: 'Professional and formal tone, suitable for business contexts',
      casual: 'Friendly and casual tone, suitable for colleagues or familiar contacts',
      brief: 'Concise and to-the-point, focusing on key information',
      neutral: 'Balanced and professional tone',
      polite: 'Very polite and accommodating tone',
      assertive: 'Direct and assertive while remaining professional',
    };

    return toneInstructions[tone] || toneInstructions.neutral;
  }

  /**
   * Parse AI response into structured suggestions
   * @private
   */
  _parseSuggestions(text) {
    try {
      const parsed = JSON.parse(text);
      return parsed.replies || [];
    } catch (error) {
      // Fallback: parse text manually
      return this._extractRepliesManually(text);
    }
  }

  /**
   * Extract replies from unstructured text
   * @private
   */
  _extractRepliesManually(text) {
    const replies = [];
    const sections = text.split(/\d+\./).filter(s => s.trim());

    sections.forEach(section => {
      const reply = {
        subject: '',
        body: '',
        explanation: '',
      };

      // Extract subject
      const subjectMatch = section.match(/Subject: (.+?)(?:\n|$)/i);
      if (subjectMatch) {
        reply.subject = subjectMatch[1].trim();
      }

      // Extract body
      const bodyMatch = section.match(/Body: (.+?)(?:Explanation:|\n\n|$)/is);
      if (bodyMatch) {
        reply.body = bodyMatch[1].trim();
      }

      // Extract explanation
      const expMatch = section.match(/Explanation: (.+?)(?:\n\n|$)/is);
      if (expMatch) {
        reply.explanation = expMatch[1].trim();
      }

      if (reply.body) {
        replies.push(reply);
      }
    });

    return replies;
  }

  /**
   * Generate quick response suggestions for voice UI
   * @param {object} email - Email object
   * @returns {Promise<Array>} - Quick reply options
   */
  async generateQuickReplies(email) {
    const { subject, body, sender } = email;

    const prompt = `Based on this email, suggest 3 short, voice-friendly reply options (under 20 words each):

Subject: ${subject}
From: ${sender.name}
Body: ${body.substring(0, 500)}

Generate 3 brief replies suitable for voice selection:
1. Positive/accepting
2. Declining/polite
3. Requesting more information

Format as JSON array of strings.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      const parsed = JSON.parse(response.content[0].text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Fallback replies
      return [
        "Yes, that sounds good to me",
        "Thank you for the email, but I'm unable to commit at this time",
        "Could you please provide more details?",
      ];
    }
  }

  /**
   * Match reply to user's writing style
   * @param {string} userReply - Example of user's writing
   * @param {object} email - Email to reply to
   * @returns {Promise<string>} - Style-matched reply
   */
  async matchWritingStyle(userReply, email) {
    const prompt = `Analyze this user's writing style and generate a reply in the same style:

User's writing sample:
"${userReply}"

Email to reply to:
Subject: ${email.subject}
Body: ${email.body}

Generate a reply matching the user's style (vocabulary, sentence structure, punctuation, formality).`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text;
  }
}

module.exports = SmartReplyService;
