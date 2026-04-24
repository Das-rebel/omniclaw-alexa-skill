/**
 * Email Intelligence Configuration
 *
 * Centralizes all configuration for email providers, agents, and system behavior
 */

module.exports = {
  // Gmail OAuth2 Configuration
  gmail: {
    oauth: {
      clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
      clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GMAIL_OAUTH_REDIRECT_URI || 'https://your-domain.com/api/email/auth/gmail/callback',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    },
    api: {
      baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me',
      timeout: 30000,
      maxRetries: 3
    },
    limits: {
      maxEmailsPerFetch: 50,
      maxAttachmentSize: 25 * 1024 * 1024, // 25MB
      maxDrafts: 100
    }
  },

  // Outlook/Microsoft Graph Configuration
  outlook: {
    oauth: {
      clientId: process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      tenantId: process.env.OUTLOOK_TENANT_ID || 'common',
      redirectUri: process.env.OUTLOOK_OAUTH_REDIRECT_URI || 'https://your-domain.com/api/email/auth/outlook/callback',
      scopes: [
        'Mail.Read',
        'Mail.Send',
        'Mail.ReadWrite'
      ]
    },
    api: {
      baseUrl: 'https://graph.microsoft.com/v1.0/me',
      timeout: 30000,
      maxRetries: 3
    },
    limits: {
      maxEmailsPerFetch: 50,
      maxAttachmentSize: 25 * 1024 * 1024,
      maxDrafts: 100
    }
  },

  // CrewAI Agent Configuration
  agents: {
    manager: {
      name: 'EmailCommandCenter',
      role: 'Email Orchestration Manager',
      goal: 'Coordinate email operations and delegate tasks to specialist agents',
      backstory: 'You are an experienced email administrator with 20 years of experience managing executive communications.',
      verbose: true,
      allowDelegation: true
    },
    inbox: {
      name: 'InboxAgent',
      role: 'Inbox Content Analyzer',
      goal: 'Analyze incoming emails, extract key information, detect urgency and sentiment',
      backstory: 'You are an expert executive assistant who can quickly summarize emails and identify what needs attention.',
      verbose: true,
      maxInterations: 3,
      tools: ['sentimentAnalyzer', 'urgencyDetector', 'emailSummarizer']
    },
    draft: {
      name: 'DraftAgent',
      role: 'Response Composer',
      goal: 'Compose well-structured email responses in different tones (formal, casual, brief)',
      backstory: 'You are a professional communication specialist who can adapt writing style to any context.',
      verbose: true,
      maxIterations: 3,
      tools: ['toneAdjuster', 'templateEngine', 'grammarChecker']
    },
    send: {
      name: 'SendAgent',
      role: 'Delivery Specialist',
      goal: 'Prepare and validate emails for delivery through appropriate channels',
      backstory: 'You are a meticulous email delivery specialist who ensures every message is properly formatted and validated.',
      verbose: true,
      maxIterations: 2,
      tools: ['emailValidator', 'attachmentHandler', 'deliveryTracker']
    }
  },

  // Email Processing Configuration
  processing: {
    summary: {
      maxLength: 150, // Words for TTS optimization
      preserveKeyInfo: true,
      includeActionItems: true,
      includeDeadlines: true
    },
    sentiment: {
      positive: ['thank', 'appreciate', 'great', 'excellent', 'love', 'happy'],
      negative: ['angry', 'upset', 'disappointed', 'frustrated', 'urgent', 'asap'],
      neutral: ['fyi', 'info', 'update', 'notification']
    },
    urgency: {
      high: ['urgent', 'asap', 'immediately', 'deadline', 'emergency', 'critical'],
      medium: ['please respond', 'awaiting', 'follow up', 'reminder'],
      low: ['fyi', 'no rush', 'when convenient', 'informational']
    },
    drafts: {
      variants: ['formal', 'casual', 'brief'],
      defaultVariant: 'formal',
      maxLength: 500
    }
  },

  // Conversation Context Configuration
  context: {
    maxHistoryLength: 10,
    contextWindow: 5, // Number of previous emails to consider
    pronounResolution: {
      enabled: true,
      entities: ['email', 'thread', 'sender', 'recipient']
    }
  },

  // AWS SES Configuration (for notifications)
  ses: {
    region: process.env.AWS_SES_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    notificationEmail: process.env.SES_NOTIFICATION_EMAIL,
    rateLimit: 14 // Emails per second (AWS SES limit)
  },

  // Caching Configuration
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000,
    keyPrefix: 'email:'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    streams: [
      { stream: process.stdout, level: 'info' },
      { path: '/var/log/omniclaw/email-intelligence.log', level: 'error' }
    ]
  }
};
