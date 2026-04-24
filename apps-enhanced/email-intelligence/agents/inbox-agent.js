/**
 * Email Inbox Agent - CrewAI Agent
 * Specializes in analyzing email content and managing inbox operations
 *
 * Responsibilities:
 * - Retrieve emails from Gmail/Outlook
 * - Analyze email content and sentiment
 * - Detect urgency and priority
 * - Search and filter emails
 * - Generate voice-optimized summaries
 */

const Agent = require('crewai').Agent;
const GmailService = require('../services/gmail-service');
const OutlookService = require('../services/outlook-service');

class InboxAgent {
  constructor(config, resilience) {
    this.config = config;
    this.resilience = resilience;

    // Initialize email services
    this.gmailService = new GmailService(config.gmail, resilience);
    this.outlookService = new OutlookService(config.outlook, resilience);

    // Create CrewAI agent
    this.agent = new Agent({
      role: 'Email Content Analyzer',
      goal: 'Retrieve, analyze, and summarize emails with urgency detection and sentiment analysis',
      backstory: `You are an expert email analyst with years of experience managing high-volume inboxes.
      You can quickly assess email importance, detect urgency, and extract key information.
      You excel at creating concise, voice-friendly summaries optimized for text-to-speech.`,
      verbose: true,
      tools: [
        this.retrieveEmails.bind(this),
        this.searchEmails.bind(this),
        this.analyzeSentiment.bind(this),
        this.detectUrgency.bind(this),
        this.createSummary.bind(this)
      ]
    });
  }

  /**
   * Get the CrewAI agent
   */
  getAgent() {
    return this.agent;
  }

  /**
   * Retrieve emails from configured provider
   */
  async retrieveEmails(folder = 'inbox', count = 10, filters = {}) {
    try {
      // Determine which provider to use
      const provider = filters.provider || this.config.defaultProvider || 'gmail';

      let emails;
      if (provider === 'gmail') {
        emails = await this.gmailService.fetchEmails(folder, count, filters);
      } else if (provider === 'outlook') {
        emails = await this.outlookService.fetchEmails(folder, count, filters);
      } else {
        // Fetch from both and merge
        const [gmailEmails, outlookEmails] = await Promise.all([
          this.gmailService.fetchEmails(folder, count, filters),
          this.outlookService.fetchEmails(folder, count, filters)
        ]);
        emails = this.mergeEmails(gmailEmails, outlookEmails);
      }

      // Analyze each email
      const analyzedEmails = await Promise.all(
        emails.map(email => this.analyzeEmail(email))
      );

      // Sort by urgency and priority
      return this.sortByPriority(analyzedEmails);
    } catch (error) {
      console.error('InboxAgent: Error retrieving emails:', error);
      throw error;
    }
  }

  /**
   * Search emails by query
   */
  async searchEmails(query, folder = 'all', provider = null) {
    try {
      const searchProvider = provider || this.config.defaultProvider || 'gmail';

      if (searchProvider === 'gmail') {
        return await this.gmailService.searchEmails(query, folder);
      } else {
        return await this.outlookService.searchEmails(query, folder);
      }
    } catch (error) {
      console.error('InboxAgent: Error searching emails:', error);
      throw error;
    }
  }

  /**
   * Analyze email sentiment
   */
  async analyzeSentiment(email) {
    const text = `${email.subject} ${email.snippet || ''}`;

    // Simple sentiment analysis
    const positiveWords = ['thank', 'appreciate', 'great', 'good', 'excellent', 'pleased'];
    const negativeWords = ['urgent', 'issue', 'problem', 'error', 'fail', 'complaint', 'angry'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'deadline', 'today', 'important'];

    const lowerText = text.toLowerCase();
    let sentiment = 'neutral';
    let urgency = 'low';

    // Check for positive indicators
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const urgentCount = urgentWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }

    // Determine urgency
    if (urgentCount >= 2 || lowerText.includes('urgent')) {
      urgency = 'high';
    } else if (urgentCount === 1) {
      urgency = 'medium';
    }

    return { sentiment, urgency };
  }

  /**
   * Detect email urgency
   */
  async detectUrgency(email) {
    const { urgency } = await this.analyzeSentiment(email);

    // Additional urgency indicators
    const subject = email.subject.toLowerCase();

    if (subject.includes('urgent') || subject.includes('asap') || subject.includes('immediate')) {
      return 'high';
    }

    // Check sender importance
    const importantSenders = this.config.importantSenders || [];
    if (importantSenders.some(sender => email.from.includes(sender))) {
      return 'medium';
    }

    // Check if recent (within 1 hour)
    const emailDate = new Date(email.date);
    const now = new Date();
    const hoursSince = (now - emailDate) / (1000 * 60 * 60);

    if (hoursSince < 1) {
      return 'medium';
    }

    return urgency;
  }

  /**
   * Create voice-optimized summary (max 150 words)
   */
  async createSummary(email) {
    const { subject, from, snippet, body } = email;

    // Start with basic info
    let summary = `From ${from}: ${subject}. `;

    // Add snippet or body summary
    if (snippet) {
      summary += snippet;
    } else if (body) {
      // Truncate body to fit within word limit
      const maxWords = 120; // Leave room for from/subject
      const words = body.split(/\s+/);
      if (words.length > maxWords) {
        summary += words.slice(0, maxWords).join(' ') + '...';
      } else {
        summary += body;
      }
    }

    // Ensure total is under 150 words
    const totalWords = summary.split(/\s+/).length;
    if (totalWords > 150) {
      const words = summary.split(/\s+/);
      summary = words.slice(0, 150).join(' ') + '...';
    }

    return summary;
  }

  /**
   * Analyze a single email
   */
  async analyzeEmail(email) {
    const { sentiment, urgency } = await this.analyzeSentiment(email);
    const detectedUrgency = await this.detectUrgency(email);
    const summary = await this.createSummary(email);

    return {
      ...email,
      sentiment,
      urgency: detectedUrgency,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Merge emails from multiple providers
   */
  mergeEmails(...emailArrays) {
    const allEmails = emailArrays.flat();
    return allEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Sort emails by priority
   */
  sortByPriority(emails) {
    const priorityScore = {
      urgency: { high: 3, medium: 2, low: 1 },
      sentiment: { negative: 2, neutral: 1, positive: 0 }
    };

    return emails.sort((a, b) => {
      const scoreA = priorityScore.urgency[a.urgency] + priorityScore.sentiment[a.sentiment];
      const scoreB = priorityScore.urgency[b.urgency] + priorityScore.sentiment[b.sentiment];
      return scoreB - scoreA;
    });
  }
}

module.exports = InboxAgent;
