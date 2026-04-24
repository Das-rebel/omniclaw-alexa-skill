# CrewAI Email Agents - Quick Reference

## Agent Overview

| Agent | File | Lines | Role |
|-------|------|-------|------|
| Manager | manager-agent.js | 403 | Orchestrator & Alexa Integration |
| Inbox | inbox-agent.js | 247 | Email Retrieval & Analysis |
| Draft | draft-agent.js | 252 | Reply Composition |
| Send | send-agent.js | 265 | Validation & Delivery |

## Quick Start

```javascript
const { ManagerAgent } = require('./agents/manager-agent');

// Initialize
const manager = new ManagerAgent({
  gmail: { /* config */ },
  outlook: { /* config */ },
  defaultProvider: 'gmail'
});

// Handle Alexa request
const response = await manager.handleEmailRequest({
  userId: 'user123',
  intent: 'CheckEmailIntent',
  slots: { folder: 'inbox', count: 5 },
  sessionId: 'session_abc'
});
```

## Alexa Intents

### CheckEmailIntent
Check inbox and summarize recent emails
```javascript
{
  intent: 'CheckEmailIntent',
  slots: {
    folder: 'inbox',    // inbox, sent, drafts
    count: 5,           // Number of emails
    filter: 'unread'    // Optional filter
  }
}
```

### ComposeEmailIntent
Create new email from scratch
```javascript
{
  intent: 'ComposeEmailIntent',
  slots: {
    recipient: 'john@example.com',
    subject: 'Meeting Tomorrow',
    message: 'Can we meet at 2pm?',
    tone: 'professional'  // professional, casual, brief
  }
}
```

### ReplyToEmailIntent
Generate reply to existing email
```javascript
{
  intent: 'ReplyToEmailIntent',
  slots: {
    emailReference: 'this',  // or email ID
    message: 'I'll be there',
    tone: 'professional'
  }
}
```

### SendEmailIntent
Send drafted email
```javascript
{
  intent: 'SendEmailIntent',
  slots: {
    // Uses last drafted email if no draft specified
  }
}
```

### SearchEmailIntent
Search emails by query
```javascript
{
  intent: 'SearchEmailIntent',
  slots: {
    query: 'meeting tomorrow',
    folder: 'all'  // all, inbox, sent
  }
}
```

## Voice Response Limits

### Manager Agent
- Max 150 words per response
- Simplified sentences (< 20 words)
- Markdown removed for TTS
- Progressive loading (3 emails at a time)

### Inbox Agent
- Email summary: 150 words max
- Includes: From, Subject, Snippet
- Urgency detection included
- Sentiment analysis included

### Draft Agent
- Max word count: Configurable (default 500)
- Tone variations: formal, casual, brief
- Template fallback if LLM fails

### Send Agent
- Validation before sending
- Confirmation message on success
- Detailed error messages

## Error Handling

### Resilience Wrapper
```javascript
await resilience.withFullResilience(
  () => crew.kickoff([task]),
  {
    timeout: 30000,    // 30 seconds
    maxRetries: 3,     // 3 attempts
    context: { operation: 'check_email' }
  }
);
```

### Fallback Strategies
1. **LLM Failure** → Template-based drafting
2. **Gmail Failure** → Try Outlook
3. **Validation Failure** → Return detailed error
4. **Network Error** → Exponential backoff

## Session Management

### Session Lifecycle
```
Created → Active → Idle (30 min) → Cleanup
```

### Context Storage
```javascript
{
  userId: 'user123',
  sessionId: 'session_abc',
  lastMentionedEmailId: 'email_123',
  lastDraft: { /* email object */ },
  recentEmails: [/* array */],
  timestamp: new Date()
}
```

### Session Cleanup
- Automatic cleanup after 30 minutes
- Manual cleanup via `manager.cleanup()`
- Context preserved across multi-turn conversations

## Pronoun Resolution

### Supported References
- "this email" → `context.lastMentionedEmailId`
- "that email" → `context.lastMentionedEmailId`
- "reply to him" → `context.lastMentionedEmailId`
- "reply to John" → Search by sender name

### Resolution Logic
```javascript
resolveEmailReference(reference, context) {
  if (reference === 'this' || reference === 'that') {
    return context.lastMentionedEmailId;
  }
  if (reference === 'him' || reference === 'her') {
    return context.lastMentionedEmailId;
  }
  // Search recent emails by name/subject
  const match = recentEmails.find(email =>
    email.from.includes(reference) ||
    email.subject.includes(reference)
  );
  return match ? match.id : null;
}
```

## Sentiment Analysis

### Positive Indicators
thank, appreciate, great, good, excellent, pleased

### Negative Indicators
urgent, issue, problem, error, fail, complaint, angry

### Urgency Indicators
urgent, asap, immediately, deadline, today, important

### Priority Scoring
```
High Urgency + Negative Sentiment = Priority 1
High Urgency + Neutral Sentiment = Priority 2
Medium Urgency + Negative Sentiment = Priority 3
etc.
```

## Tone Options

### Formal
- Professional and polite
- Suitable for business communication
- Full salutations and closings
- Complete sentences

### Casual
- Friendly and relaxed
- Suitable for colleagues
- First names only
- Conversational style

### Brief
- Concise and to-the-point
- Minimal pleasantries
- Direct communication
- Short sentences

## Configuration

### Environment Variables
```bash
# LLM Provider
ANTHROPIC_API_KEY=your_key

# Gmail
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_secret
GMAIL_REDIRECT_URI=your_redirect

# Outlook
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_secret
OUTLOOK_TENANT_ID=your_tenant

# CrewAI
CREWAI_PROCESS=hierarchical
CREWAI_MEMORY=true
CREWAI_VERBOSE=true
```

### Agent Configuration
```javascript
{
  agents: {
    manager: {
      role: 'Email Command Center',
      allowDelegation: true,
      memory: true
    },
    inbox: {
      role: 'Email Content Analyzer',
      tools: ['retrieve', 'search', 'analyze']
    },
    draft: {
      role: 'Email Composer',
      tones: ['formal', 'casual', 'brief']
    },
    send: {
      role: 'Email Delivery Specialist',
      providers: ['gmail', 'outlook']
    }
  }
}
```

## Common Patterns

### Check Email Flow
```
User: "Check my email"
→ Manager: routes to InboxAgent
→ Inbox: retrieves emails
→ Inbox: analyzes sentiment/urgency
→ Manager: formats for voice
→ Alexa: speaks summary
```

### Draft Reply Flow
```
User: "Reply to him that I'll be there"
→ Manager: resolves "him" to email
→ Manager: routes to DraftAgent
→ Draft: generates reply via LLM
→ Manager: presents draft
→ User: "Send it"
→ Manager: routes to SendAgent
→ Send: validates and sends
→ Alexa: confirms delivery
```

### Multi-turn Conversation
```
Turn 1: "Check my email"
→ Shows 5 emails, stores in context

Turn 2: "Read the third one"
→ Resolves "third one" to email index 2
→ Reads email, stores as lastMentioned

Turn 3: "Reply to him"
→ Resolves "him" to last mentioned email
→ Generates reply
```

## Debugging

### Enable Verbose Logging
```javascript
const manager = new ManagerAgent({
  ...config,
  verbose: true,
  logLevel: 'debug'
});
```

### Check Session State
```javascript
const context = manager.getOrCreateContext(userId, sessionId);
console.log('Current state:', context.state);
console.log('Last email:', context.lastMentionedEmailId);
console.log('Draft:', context.lastDraft);
```

### Test Individual Agents
```javascript
// Test inbox
const emails = await manager.inboxAgent.retrieveEmails('inbox', 5);

// Test draft
const draft = await manager.draftAgent.draftResponse(
  originalEmail,
  userInstruction,
  'formal'
);

// Test send
const result = await manager.sendAgent.validateEmail(email, 'gmail');
```

## Performance Tips

1. **Cache Email Lists** - Store recent emails for 5 minutes
2. **Batch Operations** - Retrieve multiple emails at once
3. **Progressive Loading** - Load 3 emails at a time for voice
4. **Lazy Loading** - Only load full email body when needed
5. **Session Cleanup** - Run cleanup every 10 minutes

## Troubleshooting

### Problem: "I don't have anything to repeat"
**Solution:** Ensure you're storing `lastResponse` in session

### Problem: "Which email would you like to reply to?"
**Solution:** Check that `lastMentionedEmailId` is set in context

### Problem: "Email validation failed"
**Solution:** Run `validateEmail()` to see specific issues

### Problem: "I couldn't draft a reply"
**Solution:** Check LLM API key and fallback templates

### Problem: "Session expired"
**Solution:** This is expected after 30 minutes of inactivity

## File Paths

```
/Users/Subho/omniclaw-enhanced/apps/email-intelligence/agents/
├── manager-agent.js      (403 lines)
├── inbox-agent.js        (247 lines)
├── draft-agent.js        (252 lines)
├── send-agent.js         (265 lines)
├── README.md             (Full documentation)
├── IMPLEMENTATION_STATUS.md (Status report)
└── QUICK_REFERENCE.md    (This file)
```

## Additional Resources

- **Full Documentation:** See README.md
- **Implementation Status:** See IMPLEMENTATION_STATUS.md
- **CrewAI Docs:** https://docs.crewai.com
- **Gmail API:** https://developers.google.com/gmail
- **Alexa Skills:** https://developer.amazon.com/alexa

---

**Last Updated:** March 26, 2026
**Version:** 1.0.0
