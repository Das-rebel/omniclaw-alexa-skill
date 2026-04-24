# Email Intelligence System

**Phase 1 of OmniClaw Personal Assistant** - Multi-agent email management system with CrewAI

---

## Overview

The Email Intelligence System transforms Alexa into a powerful email assistant, enabling hands-free email management through voice commands. Built with a CrewAI multi-agent architecture, it provides intelligent email analysis, drafting, and sending capabilities.

### Key Features

- **Multi-Agent Architecture**: CrewAI-powered specialist agents (Manager, Inbox, Draft, Send)
- **Voice-Optimized**: All responses optimized for text-to-speech (150-word limit)
- **Multi-Provider Support**: Gmail and Outlook integration with OAuth2
- **Smart Analysis**: Sentiment analysis, urgency detection, action item extraction
- **Response Drafting**: Three tone variants (formal, casual, brief)
- **Conversation Context**: Multi-turn email interactions with pronoun resolution
- **Resilient Design**: Built-in retry logic, circuit breakers, graceful degradation

---

## Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────┐
│                  Manager Agent                          │
│         (Email Command Center)                          │
│    Coordinates operations and delegates tasks           │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│  Inbox Agent    │ │ Draft Agent  │ │  Send Agent  │
│                 │ │              │ │              │
│ - Analyze emails│ │ - Compose    │ │ - Validate   │
│ - Detect urgency│ │   responses  │ │ - Send       │
│ - Summarize     │ │ - Edit drafts│ │ - Track      │
└─────────────────┘ └──────────────┘ └──────────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
        ┌─────────┐           ┌─────────────┐
        │ Gmail   │           │  Outlook    │
        │ Service │           │  Service    │
        └─────────┘           └─────────────┘
```

### Directory Structure

```
apps/email-intelligence/
├── agents/                    # CrewAI agents
│   ├── manager-agent.js      # Orchestration manager
│   ├── inbox-agent.js        # Email analyzer
│   ├── draft-agent.js        # Response composer
│   └── send-agent.js         # Delivery specialist
│
├── services/                  # External integrations
│   ├── gmail-service.js      # Gmail API client
│   ├── outlook-service.js    # Microsoft Graph client
│   └── logger.js             # Structured logging
│
├── api/                       # REST endpoints
│   └── email-api.js          # Express routes
│
├── config/                    # Configuration
│   └── email-config.js       # System settings
│
├── tests/                     # Test suite
│   └── email-intelligence.test.js
│
├── package.json
└── README.md
```

---

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Google Cloud Project (with Cloud Functions enabled)
- Gmail OAuth2 credentials (Google Cloud Console)
- Outlook OAuth2 credentials (Microsoft Azure Portal)

### Setup Steps

#### 1. Install Dependencies

```bash
cd ~/omniclaw-enhanced/apps/email-intelligence
npm install
```

#### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Gmail OAuth2
GMAIL_OAUTH_CLIENT_ID=your_gmail_client_id
GMAIL_OAUTH_CLIENT_SECRET=your_gmail_secret
GMAIL_OAUTH_REDIRECT_URI=https://your-domain.com/api/email/auth/gmail/callback

# Outlook OAuth2
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_secret
OUTLOOK_OAUTH_REDIRECT_URI=https://your-domain.com/api/email/auth/outlook/callback
OUTLOOK_TENANT_ID=common

# LLM Provider (for CrewAI agents)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# AWS SES (for notifications)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_SES_REGION=us-east-1

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

#### 3. Set Up Gmail OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth2 credentials (Web application)
5. Add redirect URI: `https://your-domain.com/api/email/auth/gmail/callback`
6. Copy Client ID and Secret to `.env`

#### 4. Set Up Outlook OAuth2

1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application in Microsoft Entra ID
3. Add delegated permissions: `Mail.Read`, `Mail.Send`, `Mail.ReadWrite`
4. Add redirect URI: `https://your-domain.com/api/email/auth/outlook/callback`
5. Copy Client ID and Secret to `.env`

---

## Usage

### Voice Commands via Alexa

#### Check Email
```
User: "Alexa, check my email"
Alexa: "You have 10 emails, 3 marked as urgent. Here are your urgent emails:
       1. Meeting request from John for tomorrow at 2 PM.
       2. Invoice due today from ACME Corp.
       3. Urgent: Server down alert from IT team."
```

#### Summarize Email
```
User: "Alexa, summarize this email"
Alexa: "This email from Sarah confirms tomorrow's meeting at 2 PM
       to discuss Q4 projections. She asks you to bring the sales report."
```

#### Compose Reply
```
User: "Alexa, reply that I'll attend the meeting"
Alexa: "I've prepared a formal reply. The email says: Dear Sarah,
       thank you for the meeting invitation. I'll attend tomorrow
       at 2 PM and bring the sales report. Best regards."

User: "Send it"
Alexa: "Email sent successfully to Sarah"
```

#### Draft Variants
```
User: "Alexa, show me draft options for this email"
Alexa: "I've prepared 3 draft variants: formal, casual, and brief.
       The formal draft is professional and polite.
       The casual draft is friendly and relaxed.
       The brief draft is concise and to the point.
       Which one would you like to send?"
```

#### Search Emails
```
User: "Alexa, search for emails from John"
Alexa: "Found 5 emails from John. The latest is about tomorrow's
       meeting at 2 PM to discuss Q4 projections."
```

### REST API Endpoints

#### Check Email
```bash
POST /api/email/check
Content-Type: application/json

{
  "provider": "gmail",
  "limit": 10
}

Response:
{
  "success": true,
  "data": {
    "emails": [...],
    "summary": {
      "total": 10,
      "urgent": 3,
      "normal": 7,
      "overview": "You have 10 emails, 3 marked as urgent"
    },
    "alexaResponse": "You have 10 emails..."
  }
}
```

#### Summarize Email
```bash
POST /api/email/summarize
Content-Type: application/json

{
  "emailId": "123456789",
  "provider": "gmail"
}

Response:
{
  "success": true,
  "data": {
    "emailId": "123456789",
    "summary": "Brief summary for TTS...",
    "sentiment": "neutral",
    "urgency": "medium",
    "actionItems": ["Review document"],
    "deadlines": ["Tomorrow 2 PM"],
    "alexaResponse": "This email from Sarah confirms..."
  }
}
```

#### Compose Reply
```bash
POST /api/email/reply
Content-Type: application/json

{
  "emailId": "123456789",
  "instruction": "Confirm attendance",
  "tone": "formal",
  "provider": "gmail"
}

Response:
{
  "success": true,
  "data": {
    "draft": {
      "subject": "Re: Meeting Tomorrow",
      "body": "Dear Sarah, thank you for the invitation...",
      "tone": "formal",
      "wordCount": 45
    },
    "alexaResponse": "Draft prepared. Subject: Re: Meeting Tomorrow"
  }
}
```

#### Send Email
```bash
POST /api/email/send
Content-Type: application/json

{
  "email": {
    "to": "recipient@example.com",
    "subject": "Test Email",
    "body": "This is a test email."
  },
  "provider": "gmail"
}

Response:
{
  "success": true,
  "data": {
    "messageId": "msg123",
    "provider": "gmail",
    "alexaResponse": "Email sent successfully to recipient@example.com"
  }
}
```

#### Search Emails
```bash
POST /api/email/search
Content-Type: application/json

{
  "query": "meeting tomorrow",
  "provider": "gmail",
  "limit": 10
}

Response:
{
  "success": true,
  "data": {
    "query": "meeting tomorrow",
    "count": 3,
    "emails": [...],
    "alexaResponse": "Found 3 emails matching 'meeting tomorrow'"
  }
}
```

#### Generate Draft Variants
```bash
POST /api/email/drafts/variants
Content-Type: application/json

{
  "emailId": "123456789",
  "instruction": "Confirm attendance",
  "provider": "gmail"
}

Response:
{
  "success": true,
  "data": {
    "variants": {
      "formal": { subject: "...", body: "...", tone: "formal" },
      "casual": { subject: "...", body: "...", tone: "casual" },
      "brief": { subject: "...", body: "...", tone: "brief" }
    },
    "alexaResponse": "I've prepared 3 draft variants"
  }
}
```

#### OAuth2 Authorization

**Gmail:**
```bash
# Get authorization URL
GET /api/email/auth/gmail?state=xyz

Response:
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}

# Handle callback
POST /api/email/auth/gmail/callback
Content-Type: application/json

{
  "code": "authorization_code_from_google"
}

Response:
{
  "success": true,
  "message": "Gmail connected successfully",
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Outlook:**
```bash
# Get authorization URL
GET /api/email/auth/outlook?state=xyz

Response:
{
  "success": true,
  "authUrl": "https://login.microsoftonline.com/..."
}

# Handle callback
POST /api/email/auth/outlook/callback
Content-Type: application/json

{
  "code": "authorization_code_from_microsoft"
}

Response:
{
  "success": true,
  "message": "Outlook connected successfully",
  "tokens": { ... }
}
```

---

## Testing

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### Test Coverage Areas
- ✅ Inbox Agent: Email analysis, urgency detection, sentiment analysis
- ✅ Draft Agent: Response composition, tone variants, editing
- ✅ Send Agent: Validation, sending, draft saving
- ✅ Manager Agent: Request routing, coordination
- ✅ Gmail Service: API integration, OAuth2
- ✅ Outlook Service: Microsoft Graph integration, OAuth2

---

## Alexa Integration

### Step 1: Add API Endpoints to Interaction Model

Update `interaction_model.json` in your Alexa skill:

```json
{
  "intents": [
    {
      "name": "CheckEmailIntent",
      "samples": [
        "check my email",
        "check emails",
        "do i have new emails",
        "show my emails"
      ]
    },
    {
      "name": "SummarizeEmailIntent",
      "samples": [
        "summarize this email",
        "what does this email say",
        "tell me about this email",
        "read this email"
      ]
    },
    {
      "name": "ComposeReplyIntent",
      "samples": [
        "reply {instruction}",
        "send a reply saying {instruction}",
        "respond with {instruction}",
        "tell them {instruction}"
      ],
      "slots": [
        {
          "name": "instruction",
          "type": "AMAZON.SearchQuery"
        }
      ]
    },
    {
      "name": "SendEmailIntent",
      "samples": [
        "send the email",
        "send it",
        "confirm sending"
      ]
    },
    {
      "name": "SearchEmailsIntent",
      "samples": [
        "search for emails {query}",
        "find emails about {query}",
        "show emails from {query}",
        "look for {query} in emails"
      ],
      "slots": [
        {
          "name": "query",
          "type": "AMAZON.SearchQuery"
        }
      ]
    },
    {
      "name": "DraftVariantsIntent",
      "samples": [
        "show me draft options",
        "give me draft variants",
        "show different versions",
        "draft alternatives"
      ]
    },
    {
      "name": "ChooseToneIntent",
      "samples": [
        "make it {tone}",
        "use {tone} tone",
        "{tone} version"
      ],
      "slots": [
        {
          "name": "tone",
          "type": "TONE_TYPE"
        }
      ]
    }
  ],
  "types": [
    {
      "name": "TONE_TYPE",
      "values": [
        { "name": { "value": "formal" } },
        { "name": { "value": "casual" } },
        { "name": { "value": "brief" } }
      ]
    }
  ]
}
```

### Step 2: Update Alexa Handler

In your Alexa skill handler, add these intent handlers:

```javascript
const handlers = {
  CheckEmailIntent: async function(handlerInput) {
    const response = await axios.post(`${API_BASE}/api/email/check`, {
      provider: 'gmail',
      limit: 10
    });

    return handlerInput.responseBuilder
      .speak(response.data.data.alexaResponse)
      .getResponse();
  },

  SummarizeEmailIntent: async function(handlerInput) {
    const emailId = handlerInput.attributesManager.getSessionAttributes().currentEmailId;

    const response = await axios.post(`${API_BASE}/api/email/summarize`, {
      emailId,
      provider: 'gmail'
    });

    return handlerInput.responseBuilder
      .speak(response.data.data.alexaResponse)
      .getResponse();
  },

  ComposeReplyIntent: async function(handlerInput) {
    const instruction = handlerInput.requestEnvelope.request.intent.slots.instruction.value;
    const emailId = handlerInput.attributesManager.getSessionAttributes().currentEmailId;

    const response = await axios.post(`${API_BASE}/api/email/reply`, {
      emailId,
      instruction,
      tone: 'formal',
      provider: 'gmail'
    });

    // Save draft for sending
    handlerInput.attributesManager.getSessionAttributes().currentDraft = response.data.data.draft;

    return handlerInput.responseBuilder
      .speak(response.data.data.alexaResponse)
      .reprompt("Would you like to send it, make changes, or see other versions?")
      .getResponse();
  },

  SendEmailIntent: async function(handlerInput) {
    const draft = handlerInput.attributesManager.getSessionAttributes().currentDraft;

    const response = await axios.post(`${API_BASE}/api/email/send`, {
      email: draft,
      provider: 'gmail'
    });

    return handlerInput.responseBuilder
      .speak(response.data.data.alexaResponse)
      .getResponse();
  },

  SearchEmailsIntent: async function(handlerInput) {
    const query = handlerInput.requestEnvelope.request.intent.slots.query.value;

    const response = await axios.post(`${API_BASE}/api/email/search`, {
      query,
      provider: 'gmail',
      limit: 10
    });

    return handlerInput.responseBuilder
      .speak(response.data.data.alexaResponse)
      .getResponse();
  },

  DraftVariantsIntent: async function(handlerInput) {
    const emailId = handlerInput.attributesManager.getSessionAttributes().currentEmailId;
    const instruction = handlerInput.attributesManager.getSessionAttributes().lastInstruction;

    const response = await axios.post(`${API_BASE}/api/email/drafts/variants`, {
      emailId,
      instruction,
      provider: 'gmail'
    });

    return handlerInput.responseBuilder
      .speak(response.data.data.alexaResponse)
      .getResponse();
  }
};
```

---

## Deployment

### Deploy to Google Cloud Functions

```bash
# Deploy email API function
gcloud functions deploy email-intelligence-api \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point app \
  --region asia-south1 \
  --memory 512MB \
  --timeout 60s \
  --set-env-vars GMAIL_OAUTH_CLIENT_ID=$GMAIL_OAUTH_CLIENT_ID \
  --set-env-vars GMAIL_OAUTH_CLIENT_SECRET=$GMAIL_OAUTH_CLIENT_SECRET
```

### Deploy to Cloud Run (for long-running operations)

```bash
# Build and deploy to Cloud Run
gcloud run deploy email-intelligence-service \
  --source . \
  --platform managed \
  --region asia-south1 \
  --memory 512Mi \
  --timeout 300s \
  --max-instances 10 \
  --min-instances 0
```

---

## Performance & Scalability

### Response Times
- Email check: < 3s (for 10 emails)
- Email summary: < 2s
- Draft composition: < 4s
- Email sending: < 5s

### Rate Limits
- Gmail API: 250 quota units per second
- Outlook API: 10,000 requests per 10 minutes
- AWS SES: 14 emails per second

### Cost Optimization
- Use Cloud Functions for sporadic usage
- Use Cloud Run for heavy operations
- Enable response caching
- Batch API calls when possible

---

## Troubleshooting

### Common Issues

**Issue**: "Gmail service not initialized"
**Solution**: Complete OAuth2 flow and store tokens securely

**Issue**: "Email sending failed"
**Solution**: Check rate limits, verify recipient address, check quota

**Issue**: "Draft generation timeout"
**Solution**: Increase timeout, check LLM API status, enable fallback

**Issue**: "Circuit breaker open"
**Solution**: Wait 60s for automatic reset, check service health

### Debug Mode

Enable detailed logging:

```bash
export LOG_LEVEL=debug
npm run dev
```

Check logs:

```bash
gcloud functions logs read email-intelligence-api --limit 50
```

---

## Security Considerations

1. **OAuth2 Tokens**: Store in Google Secret Manager, never in code
2. **Email Content**: Encrypt at rest, don't log sensitive data
3. **Rate Limiting**: Implement per-user rate limits
4. **Input Validation**: Validate all email addresses and content
5. **CORS**: Configure proper CORS headers for API endpoints

---

## Future Enhancements

- [ ] Attachment handling and voice description
- [ ] Thread-based conversation management
- [ ] Smart scheduling integration
- [ ] Email categorization and labeling
- [ ] Multi-language support for email content
- [ ] Voice attachment recording
- [ ] Calendar integration from email content

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [OmniClaw Issues](https://github.com/your-org/omniclaw-enhanced/issues)
- Documentation: [Full Docs](https://docs.omniclaw.dev)
- Email: support@omniclaw.dev

---

**Status**: ✅ Phase 1 Complete
**Version**: 1.0.0
**Last Updated**: 2026-03-24
**Maintained By**: OmniClaw Team
