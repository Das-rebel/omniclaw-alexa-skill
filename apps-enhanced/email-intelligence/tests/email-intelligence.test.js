/**
 * Email Intelligence Test Suite
 *
 * Comprehensive tests for all email intelligence components
 */

const { InboxAgent } = require('../agents/inbox-agent');
const { DraftAgent } = require('../agents/draft-agent');
const { SendAgent } = require('../agents/send-agent');
const { ManagerAgent } = require('../agents/manager-agent');
const { GmailService } = require('../services/gmail-service');
const { OutlookService } = require('../services/outlook-service');

describe('Email Intelligence System', () => {
  describe('InboxAgent', () => {
    let inboxAgent;
    let mockLLMClient;

    beforeEach(() => {
      mockLLMClient = {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      };
      inboxAgent = new InboxAgent(mockLLMClient);
    });

    test('should analyze email and extract key information', async () => {
      const mockEmail = {
        id: '123',
        from: 'john@example.com',
        subject: 'Meeting Tomorrow',
        body: 'Hi, lets meet tomorrow at 2pm to discuss the project.',
        snippet: 'Hi, lets meet tomorrow at 2pm'
      };

      const analysis = await inboxAgent.analyzeEmail(mockEmail);

      expect(analysis).toHaveProperty('summary');
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('urgency');
      expect(analysis).toHaveProperty('actionItems');
      expect(analysis).toHaveProperty('deadlines');
    });

    test('should detect urgent emails', async () => {
      const urgentEmail = {
        id: '124',
        from: 'urgent@example.com',
        subject: 'URGENT: Immediate Action Required',
        body: 'This is urgent and requires immediate attention.',
        snippet: 'This is urgent'
      };

      const urgency = await inboxAgent.detectUrgency(urgentEmail);

      expect(urgency.isUrgent).toBe(true);
      expect(urgency.urgencyLevel).toBe('high');
    });

    test('should analyze sentiment', async () => {
      const positiveEmail = {
        id: '125',
        from: 'happy@example.com',
        subject: 'Great Work!',
        body: 'Thank you for the excellent work. Really appreciate it!',
        snippet: 'Thank you for the excellent work'
      };

      const sentiment = await inboxAgent.analyzeSentiment(positiveEmail);

      expect(sentiment).toHaveProperty('sentiment');
      expect(['positive', 'negative', 'neutral']).toContain(sentiment.sentiment);
    });

    test('should fallback to rule-based analysis when LLM fails', async () => {
      const mockEmail = {
        id: '126',
        from: 'test@example.com',
        subject: 'Test',
        body: 'This is a test email with urgent content',
        snippet: 'Test email'
      };

      // Force LLM failure
      mockLLMClient.chat.completions.create.mockRejectedValue(new Error('LLM failed'));

      const analysis = await inboxAgent.analyzeEmail(mockEmail);

      expect(analysis).toHaveProperty('summary');
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('urgency');
    });
  });

  describe('DraftAgent', () => {
    let draftAgent;
    let mockLLMClient;

    beforeEach(() => {
      mockLLMClient = {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      };
      draftAgent = new DraftAgent(mockLLMClient);
    });

    test('should draft formal response', async () => {
      const originalEmail = {
        id: '123',
        from: 'colleague@example.com',
        subject: 'Project Update',
        body: 'Here is the project update.',
        snippet: 'Project update'
      };

      const draft = await draftAgent.draftResponse(
        originalEmail,
        'Thank you for the update',
        'formal'
      );

      expect(draft).toHaveProperty('subject');
      expect(draft).toHaveProperty('body');
      expect(draft.tone).toBe('formal');
    });

    test('should draft casual response', async () => {
      const originalEmail = {
        id: '124',
        from: 'friend@example.com',
        subject: 'Catching up',
        body: 'Hey, how are you?',
        snippet: 'Hey, how are you?'
      };

      const draft = await draftAgent.draftResponse(
        originalEmail,
        'Doing great!',
        'casual'
      );

      expect(draft.tone).toBe('casual');
    });

    test('should draft brief response', async () => {
      const originalEmail = {
        id: '125',
        from: 'boss@example.com',
        subject: 'Quick question',
        body: 'What is the status?',
        snippet: 'What is the status?'
      };

      const draft = await draftAgent.draftResponse(
        originalEmail,
        'On track',
        'brief'
      );

      expect(draft.tone).toBe('brief');
      expect(draft.wordCount).toBeLessThan(100);
    });

    test('should generate multiple variants', async () => {
      const originalEmail = {
        id: '126',
        from: 'client@example.com',
        subject: 'Proposal',
        body: 'Please send the proposal.',
        snippet: 'Please send the proposal'
      };

      const variants = await draftAgent.draftVariants(
        originalEmail,
        'Here is the proposal'
      );

      expect(variants).toHaveProperty('formal');
      expect(variants).toHaveProperty('casual');
      expect(variants).toHaveProperty('brief');
    });
  });

  describe('SendAgent', () => {
    let sendAgent;
    let mockGmailService;
    let mockOutlookService;

    beforeEach(() => {
      mockGmailService = {
        sendEmail: jest.fn(),
        createDraftEmail: jest.fn()
      };
      mockOutlookService = {
        sendEmail: jest.fn(),
        createDraftEmail: jest.fn()
      };
      sendAgent = new SendAgent(mockGmailService, mockOutlookService);
    });

    test('should validate email before sending', async () => {
      const email = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        body: 'This is a test email.'
      };

      const validation = await sendAgent.validateEmail(email, 'gmail');

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('warnings');
    });

    test('should send email via Gmail', async () => {
      const email = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        body: 'This is a test email.'
      };

      mockGmailService.sendEmail.mockResolvedValue({ id: 'msg123' });

      const result = await sendAgent.sendEmail(email, 'gmail');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg123');
      expect(result.provider).toBe('gmail');
    });

    test('should send email via Outlook', async () => {
      const email = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        body: 'This is a test email.'
      };

      mockOutlookService.sendEmail.mockResolvedValue({ success: true });

      const result = await sendAgent.sendEmail(email, 'outlook');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('outlook');
    });

    test('should save draft', async () => {
      const email = {
        to: 'recipient@example.com',
        subject: 'Draft Email',
        body: 'Draft content.'
      };

      mockGmailService.createDraftEmail.mockResolvedValue({ id: 'draft123' });

      const result = await sendAgent.saveDraft(email, 'gmail');

      expect(result.success).toBe(true);
      expect(result.draftId).toBe('draft123');
    });

    test('should reject invalid email', async () => {
      const invalidEmail = {
        to: 'not-an-email',
        subject: '',
        body: ''
      };

      mockGmailService.sendEmail.mockRejectedValue(new Error('Invalid email'));

      const result = await sendAgent.sendEmail(invalidEmail, 'gmail');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ManagerAgent', () => {
    let managerAgent;
    let mockLLMClient;
    let mockGmailService;
    let mockOutlookService;

    beforeEach(() => {
      mockLLMClient = {};
      mockGmailService = {
        fetchRecentEmails: jest.fn(),
        getMessage: jest.fn()
      };
      mockOutlookService = {
        fetchRecentEmails: jest.fn(),
        getMessage: jest.fn()
      };

      managerAgent = new ManagerAgent(mockLLMClient, mockGmailService, mockOutlookService);
    });

    test('should handle CHECK_EMAIL request', async () => {
      const mockEmails = [
        { id: '1', from: 'test@example.com', subject: 'Test', body: 'Test body' }
      ];
      mockGmailService.fetchRecentEmails.mockResolvedValue(mockEmails);

      const request = {
        type: 'CHECK_EMAIL',
        provider: 'gmail',
        limit: 10
      };

      const result = await managerAgent.processRequest(request);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('emails');
      expect(result).toHaveProperty('summary');
    });

    test('should handle SUMMARIZE_EMAIL request', async () => {
      const mockEmail = {
        id: '1',
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test body'
      };
      mockGmailService.getMessage.mockResolvedValue(mockEmail);

      const request = {
        type: 'SUMMARIZE_EMAIL',
        emailId: '1',
        provider: 'gmail'
      };

      const result = await managerAgent.processRequest(request);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('summary');
    });

    test('should handle COMPOSE_REPLY request', async () => {
      const mockEmail = {
        id: '1',
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test body'
      };
      mockGmailService.getMessage.mockResolvedValue(mockEmail);

      const request = {
        type: 'COMPOSE_REPLY',
        emailId: '1',
        instruction: 'Reply with thanks',
        tone: 'formal',
        provider: 'gmail'
      };

      const result = await managerAgent.processRequest(request);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('draft');
    });

    test('should handle SEARCH_EMAILS request', async () => {
      const mockEmails = [
        { id: '1', from: 'test@example.com', subject: 'Search Result', body: 'Found it' }
      ];
      mockGmailService.fetchRecentEmails.mockResolvedValue(mockEmails);

      const request = {
        type: 'SEARCH_EMAILS',
        query: 'important',
        provider: 'gmail',
        limit: 10
      };

      const result = await managerAgent.processRequest(request);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  describe('GmailService', () => {
    let gmailService;

    beforeEach(() => {
      gmailService = new GmailService();
    });

    test('should initialize with OAuth2 credentials', () => {
      const credentials = {
        access_token: 'test_token',
        refresh_token: 'test_refresh'
      };

      expect(() => {
        gmailService.initialize(credentials);
      }).not.toThrow();
    });

    test('should generate auth URL', () => {
      const authUrl = gmailService.getAuthUrl('test_state');

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('scope=');
    });
  });

  describe('OutlookService', () => {
    let outlookService;

    beforeEach(() => {
      outlookService = new OutlookService();
    });

    test('should initialize with access token', () => {
      const tokens = {
        accessToken: 'test_token',
        refreshToken: 'test_refresh'
      };

      expect(() => {
        outlookService.initialize(tokens);
      }).not.toThrow();
    });

    test('should generate auth URL', () => {
      const authUrl = outlookService.getAuthUrl('test_state');

      expect(authUrl).toContain('login.microsoftonline.com');
      expect(authUrl).toContain('scope=');
    });
  });
});
